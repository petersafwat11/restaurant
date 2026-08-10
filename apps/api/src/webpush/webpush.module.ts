import { Module } from '@nestjs/common';
import { WebPushService } from './webpush.service';

@Module({
  providers: [WebPushService],
  exports: [WebPushService],
})
export class WebPushModule {}
