import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from './auth.types';

interface RequestWithUser {
  user?: UserContext;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();

    return req.user;
  },
);
