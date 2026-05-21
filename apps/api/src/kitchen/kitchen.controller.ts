import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { OrdersService } from '../orders/orders.service';

@ApiTags('kitchen')
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly orders: OrdersService) {}

  @Get('tickets')
  @Permissions('kitchen:read')
  tickets() {
    return this.orders.listKitchenTickets();
  }
}
