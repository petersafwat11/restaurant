import { Global, Module } from '@nestjs/common';
import { AnalyticsProductService } from './analytics-product.service';

@Global()
@Module({
  providers: [AnalyticsProductService],
  exports: [AnalyticsProductService],
})
export class AnalyticsProductModule {}
