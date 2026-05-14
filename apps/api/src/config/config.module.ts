import { Global, Module } from '@nestjs/common';
import { type Env, env } from './env';

export const ENV = Symbol('ENV');
export type ENV_TYPE = Env;

@Global()
@Module({
  providers: [{ provide: ENV, useValue: env }],
  exports: [ENV],
})
export class ConfigModule {}
