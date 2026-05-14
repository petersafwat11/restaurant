import { Module } from '@nestjs/common';
import { ReservationAvailabilityService } from './reservation-availability.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationAvailabilityService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
