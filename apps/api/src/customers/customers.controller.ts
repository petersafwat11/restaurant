import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  BroadcastEmailSchema,
  BulkTagCustomersSchema,
  CreateCustomerNoteSchema,
  CreateCustomerTagSchema,
  CustomerExportQuerySchema,
  CustomerListQuerySchema,
} from '@repo/types';
import type {
  BroadcastEmailDto,
  BulkTagCustomersDto,
  CreateCustomerNoteDto,
  CreateCustomerTagDto,
  CustomerExportQuery,
  CustomerListQuery,
} from '@repo/types';
import type { FastifyReply } from 'fastify';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Permissions('customer:read')
  @Get()
  list(@Query(new ZodValidationPipe(CustomerListQuerySchema)) q: CustomerListQuery) {
    return this.customers.list(q);
  }

  // CSV/PDF export — same filters as `list`, no pagination. Declared before
  // `:id` so the `export` segment isn't swallowed as an id.
  @Permissions('customer:read')
  @Get('export')
  async exportList(
    @Query(new ZodValidationPipe(CustomerExportQuerySchema)) query: CustomerExportQuery,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.customers.exportList(query);
    reply.header('Content-Type', file.contentType);
    reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
    reply.send(file.content);
  }

  @Permissions('customer:read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.customers.get(id);
  }

  @Permissions('customer:notes')
  @Patch(':id/notes')
  addNote(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCustomerNoteSchema)) dto: CreateCustomerNoteDto,
  ) {
    return this.customers.addNote(id, user.id, dto);
  }

  @Permissions('customer:read')
  @Get('tags/all')
  listTags() {
    return this.customers.listTags();
  }

  @Permissions('customer:tag')
  @Post('tags')
  createTag(@Body(new ZodValidationPipe(CreateCustomerTagSchema)) dto: CreateCustomerTagDto) {
    return this.customers.createTag(dto);
  }

  @Permissions('customer:tag')
  @Delete('tags/:tagId')
  @HttpCode(200)
  async deleteTag(@Param('tagId') tagId: string) {
    await this.customers.deleteTag(tagId);
    return { success: true as const };
  }

  @Permissions('customer:tag')
  @Post('bulk/tags')
  @HttpCode(200)
  bulkTag(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(BulkTagCustomersSchema)) dto: BulkTagCustomersDto,
  ) {
    return this.customers.bulkTag(dto, user.id);
  }

  @Permissions('customer:email')
  @Post('bulk/email')
  @HttpCode(202)
  broadcastEmail(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(BroadcastEmailSchema)) dto: BroadcastEmailDto,
  ) {
    return this.customers.broadcastEmail(dto, user.id);
  }
}
