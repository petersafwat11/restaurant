import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_SMS } from '@repo/jobs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_SMS })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
