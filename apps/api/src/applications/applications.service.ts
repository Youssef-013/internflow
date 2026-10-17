import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ApplicationListDto, CreateApplicationDto, UpdateApplicationDto } from './application.dto';

const FIELDS = {
  id: true, company: true, position: true, status: true, appliedAt: true,
  deadline: true, notes: true, createdAt: true, updatedAt: true,
} as const;

function dateValue(value: string | null | undefined) {
  if (typeof value !== 'string') return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException('Invalid application date');
  return date;
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: {
        userId, company: dto.company, position: dto.position, status: dto.status,
        appliedAt: dateValue(dto.appliedAt), deadline: dateValue(dto.deadline), notes: dto.notes,
      }, select: FIELDS,
    });
  }

  async list(userId: string, query: ApplicationListDto) {
    const where = { userId, status: query.status };
    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where, select: FIELDS, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(userId: string, id: string) {
    const item = await this.prisma.application.findFirst({ where: { id, userId }, select: FIELDS });
    if (!item) throw new NotFoundException('Application not found');
    return item;
  }

  private missing(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw new NotFoundException('Application not found');
    }
    throw error;
  }

  async update(userId: string, id: string, dto: UpdateApplicationDto) {
    const data: Prisma.ApplicationUpdateInput = {};
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.appliedAt !== undefined) data.appliedAt = dateValue(dto.appliedAt);
    if (dto.deadline !== undefined) data.deadline = dateValue(dto.deadline);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (!Object.keys(data).length) throw new BadRequestException('At least one application field is required');
    try {
      // Ownership and mutation are checked atomically in the same database operation.
      return await this.prisma.application.update({ where: { id, userId }, data, select: FIELDS });
    } catch (error: unknown) { return this.missing(error); }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.application.delete({ where: { id, userId }, select: { id: true } });
    } catch (error: unknown) { this.missing(error); }
  }
}
