import {
  Body,
  Controller,
  Delete,
  type ExecutionContext,
  Get,
  Param,
  Patch,
  Post,
  Query,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AvailabilityQuerySchema,
  CancelReservationSchema,
  CreateReservationSchema,
  CreateTableSchema,
  MoveReservationSchema,
  ReservationListQuerySchema,
  SeatReservationSchema,
  UpdateReservationSchema,
  UpdateTableSchema,
} from '@repo/types';
import type {
  AvailabilityQueryDto,
  CancelReservationDto,
  CreateReservationDto,
  CreateTableDto,
  MoveReservationDto,
  ReservationListQuery,
  SeatReservationDto,
  UpdateReservationDto,
  UpdateTableDto,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReservationsService } from './reservations.service';

interface OptionalUser {
  id?: string;
  permissions?: string[];
}

const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OptionalUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: OptionalUser }>();
    return req.user ?? null;
  },
);

@ApiTags('reservations')
@Controller()
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Public()
  @Get('reservations/availability')
  availability(@Query(new ZodValidationPipe(AvailabilityQuerySchema)) q: AvailabilityQueryDto) {
    return this.reservations.getAvailability(q);
  }

  @Public()
  @Post('reservations')
  create(
    @CurrentUserOptional() user: OptionalUser | null,
    @Body(new ZodValidationPipe(CreateReservationSchema)) dto: CreateReservationDto,
  ) {
    return this.reservations.create(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      dto,
    );
  }

  @Get('reservations/me')
  listMine(@CurrentUser() user: RequestUser) {
    return this.reservations.listMine({ userId: user.id, permissions: user.permissions });
  }

  @Permissions('reservation:read')
  @Get('reservations')
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(ReservationListQuerySchema)) q: ReservationListQuery,
  ) {
    return this.reservations.list({ userId: user.id, permissions: user.permissions }, q);
  }

  @Get('reservations/:id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.getById({ userId: user.id, permissions: user.permissions }, id);
  }

  @Patch('reservations/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateReservationSchema)) dto: UpdateReservationDto,
  ) {
    return this.reservations.update(
      { userId: user.id, permissions: user.permissions },
      id,
      dto,
    );
  }

  @Post('reservations/:id/cancel')
  @AuditAction('reservation:cancel', 'reservation')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelReservationSchema)) dto: CancelReservationDto,
  ) {
    return this.reservations.cancel(
      { userId: user.id, permissions: user.permissions },
      id,
      dto.reason,
    );
  }

  @Permissions('reservation:write')
  @Post('reservations/:id/move')
  move(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(MoveReservationSchema)) dto: MoveReservationDto,
  ) {
    return this.reservations.move(
      { userId: user.id, permissions: user.permissions },
      id,
      dto,
    );
  }

  @Permissions('reservation:write')
  @Post('reservations/:id/seat')
  @AuditAction('reservation:seat', 'reservation')
  seat(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SeatReservationSchema)) dto: SeatReservationDto,
  ) {
    return this.reservations.transition(
      { userId: user.id, permissions: user.permissions },
      id,
      'seated',
      { tableId: dto.tableId },
    );
  }

  @Permissions('reservation:write')
  @Post('reservations/:id/complete')
  @AuditAction('reservation:complete', 'reservation')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.transition(
      { userId: user.id, permissions: user.permissions },
      id,
      'completed',
    );
  }

  @Permissions('reservation:write')
  @Post('reservations/:id/no-show')
  @AuditAction('reservation:no_show', 'reservation')
  noShow(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reservations.transition(
      { userId: user.id, permissions: user.permissions },
      id,
      'no_show',
    );
  }

  // ---- Tables ------------------------------------------------------------

  @Public()
  @Get('tables')
  listTables() {
    return this.reservations.listTables();
  }

  @Permissions('reservation:write')
  @Post('tables')
  createTable(@Body(new ZodValidationPipe(CreateTableSchema)) dto: CreateTableDto) {
    return this.reservations.createTable(dto);
  }

  @Permissions('reservation:write')
  @Patch('tables/:id')
  updateTable(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTableSchema)) dto: UpdateTableDto,
  ) {
    return this.reservations.updateTable(id, dto);
  }

  @Permissions('reservation:write')
  @Delete('tables/:id')
  async deleteTable(@Param('id') id: string) {
    await this.reservations.deleteTable(id);
    return { success: true as const };
  }
}
