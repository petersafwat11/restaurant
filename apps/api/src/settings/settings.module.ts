import { Module } from '@nestjs/common';
import { DeliveryZoneService } from './delivery-zone.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, DeliveryZoneService],
  exports: [SettingsService, DeliveryZoneService],
})
export class SettingsModule {}
