import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

class ApplicationDetailsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  appliedAt?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  deadline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string | null;
}

export class CreateApplicationDto extends ApplicationDetailsDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 200)
  company!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 200)
  position!: string;
}

export class UpdateApplicationDto extends ApplicationDetailsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 200)
  company?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 200)
  position?: string;
}

export class ApplicationListDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class ApplicationIdDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,128}$/)
  id!: string;
}
