import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  QUEUE_ACCOUNT_DELETION,
  QUEUE_ANALYTICS,
  QUEUE_AUDIT,
  QUEUE_EMAIL,
  QUEUE_PUSH,
  QUEUE_RECEIPT,
  QUEUE_RECONCILIATION,
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
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_AUDIT },
      { name: QUEUE_RECONCILIATION },
      { name: QUEUE_ACCOUNT_DELETION },
    ),
  ],
  exports: [BullModule],
})
export class BullmqModule {}
