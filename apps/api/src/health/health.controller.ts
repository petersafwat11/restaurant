import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('healthz')
  @Public()
  healthz() {
    return { ok: true };
  }
}
