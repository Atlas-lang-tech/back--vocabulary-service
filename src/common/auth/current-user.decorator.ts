import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { UserContext } from './user-context.guard.js';

export type { UserContext };

/**
 * Injects the `UserContext` attached by `UserContextGuard`. Use only on routes
 * protected by that guard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserContext => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as UserContext;
  },
);
