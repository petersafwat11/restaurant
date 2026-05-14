import { type ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof RequestUser | undefined,
    ctx: ExecutionContext,
  ): RequestUser | RequestUser[keyof RequestUser] => {
    const req = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return data ? req.user[data] : req.user;
  },
);
