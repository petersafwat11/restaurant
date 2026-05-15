import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AddressesModule } from './addresses/addresses.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit-log/audit.module';
import { AuditInterceptor } from './audit-log/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { BullmqModule } from './bullmq/bullmq.module';
import { CartModule } from './cart/cart.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SettingsModule } from './settings/settings.module';
import { StaffModule } from './staff/staff.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ConfigModule } from './config/config.module';
import { JobsModule } from './jobs/jobs.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MailerModule } from './mailer/mailer.module';
import { MenuModule } from './menu/menu.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    PrismaModule,
    RedisModule,
    BullmqModule,
    MailerModule,
    SmsModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    RestaurantsModule,
    MenuModule,
    UploadsModule,
    PromotionsModule,
    CartModule,
    PricingModule,
    OrdersModule,
    PaymentsModule,
    RealtimeModule,
    NotificationsModule,
    KitchenModule,
    ReservationsModule,
    ReviewsModule,
    CustomersModule,
    StaffModule,
    SettingsModule,
    AuditModule,
    AnalyticsModule,
    ReportsModule,
    LoyaltyModule,
    JobsModule,
    SchedulerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
