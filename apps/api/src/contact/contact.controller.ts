import { Body, Controller, Get, HttpCode, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type ContactMessageListQuery,
  ContactMessageListQuerySchema,
  type CreateContactMessageDto,
  CreateContactMessageSchema,
  type UpdateContactMessageDto,
  UpdateContactMessageSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ContactService } from './contact.service';

@ApiTags('contact')
@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post('contact')
  @HttpCode(201)
  create(
    @Ip() ip: string,
    @Body(new ZodValidationPipe(CreateContactMessageSchema)) dto: CreateContactMessageDto,
  ) {
    return this.contact.create(dto, ip || null);
  }

  @Permissions('contact:read')
  @Get('admin/contact')
  list(
    @Query(new ZodValidationPipe(ContactMessageListQuerySchema)) q: ContactMessageListQuery,
  ) {
    return this.contact.list(q);
  }

  @Permissions('contact:read')
  @Patch('admin/contact/:id')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContactMessageSchema)) dto: UpdateContactMessageDto,
  ) {
    return this.contact.updateStatus(id, dto, user.id);
  }
}
