import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthRequest } from '../auth/auth.guard';
import { ApplicationIdDto, ApplicationListDto, CreateApplicationDto, UpdateApplicationDto } from './application.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Req() request: AuthRequest, @Body() dto: CreateApplicationDto) {
    return this.applications.create(request.user.id, dto);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthRequest, @Query() query: ApplicationListDto) {
    return this.applications.list(request.user.id, query);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Req() request: AuthRequest, @Param() params: ApplicationIdDto) {
    return this.applications.get(request.user.id, params.id);
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  update(@Req() request: AuthRequest, @Param() params: ApplicationIdDto, @Body() dto: UpdateApplicationDto) {
    return this.applications.update(request.user.id, params.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  remove(@Req() request: AuthRequest, @Param() params: ApplicationIdDto) {
    return this.applications.remove(request.user.id, params.id);
  }
}
