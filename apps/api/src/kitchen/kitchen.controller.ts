import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { OrdersService } from '../orders/orders.service';

@ApiTags('kitchen')
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly orders: OrdersService) {}

  @Get('tickets')
  @Permissions('kitchen:read')
  tickets(@Query('restaurantId') restaurantId: string) {
    return this.orders.listKitchenTickets(restaurantId);
  }
}
