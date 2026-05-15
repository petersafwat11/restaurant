import { Global, Module } from '@nestjs/common';
import { FeatureFlagGuard } from './feature-flag.decorator';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
