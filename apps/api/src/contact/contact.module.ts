import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL } from '@repo/jobs';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
