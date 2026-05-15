import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateCustomerNoteSchema, CustomerListQuerySchema } from '@repo/types';
import type { CreateCustomerNoteDto, CustomerListQuery } from '@repo/types';
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

  @Permissions('customer:read')
  @Get(':id')
  get(@Param('id') id: string, @Query('restaurantId') restaurantId?: string) {
    return this.customers.get(id, restaurantId);
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
}
