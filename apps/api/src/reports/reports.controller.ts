import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateExportSchema } from '@repo/types';
import type { CreateExportDto } from '@repo/types';
import type { FastifyReply } from 'fastify';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Permissions('report:export')
  @Post('exports')
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(CreateExportSchema)) dto: CreateExportDto,
  ) {
    return this.reports.create(user.id, dto);
  }

  @Permissions('report:read')
  @Get('exports')
  list(@CurrentUser() user: RequestUser) {
    return this.reports.list(user.id, user.permissions);
  }

  @Permissions('report:read')
  @Get('exports/:id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reports.getById(user.id, user.permissions, id);
  }

  @Permissions('report:read')
  @Get('exports/:id/download')
  async download(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.reports.download(user.id, user.permissions, id);
    reply.header('Content-Type', file.contentType);
    reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
    reply.send(file.content);
  }
}
