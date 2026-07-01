import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_ACCOUNT_DELETION } from '@repo/jobs';
import { MailerModule } from '../mailer/mailer.module';
import { AccountDeletionController } from './account-deletion.controller';
import { AccountDeletionProcessor } from './account-deletion.processor';
import { AccountDeletionService } from './account-deletion.service';

/**
 * Account deletion / anonymisation (GDPR erasure, plan §G2). Owns its own queue
 * registration so the service + processor can inject it; the queue is also added
 * to the global list in bullmq.module.ts. PrismaService/ENV are global.
 */
@Module({
  imports: [MailerModule, BullModule.registerQueue({ name: QUEUE_ACCOUNT_DELETION })],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionService, AccountDeletionProcessor],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}
