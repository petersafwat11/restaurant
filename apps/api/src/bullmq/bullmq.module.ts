import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  QUEUE_ANALYTICS,
  QUEUE_AUDIT,
  QUEUE_EMAIL,
  QUEUE_PUSH,
  QUEUE_RECEIPT,
  QUEUE_REPORTS,
  QUEUE_SMS,
} from '@repo/jobs';
import { ENV, type ENV_TYPE } from '../config/config.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: ENV_TYPE) => ({
        connection: { url: env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_SMS },
      { name: QUEUE_PUSH },
      { name: QUEUE_RECEIPT },
      { name: QUEUE_REPORTS },
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_AUDIT },
    ),
  ],
  exports: [BullModule],
})
export class BullmqModule {}
