import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Request-scoped user identity derived from the gateway headers
 * (`X-User-Id` / `X-User-Role` / `X-User-Plan`) that Traefik sets after
 * ForwardAuth. Populated by {@link UserContextGuard} onto `req.user`.
 */
export interface UserContext {
  userId: string;
  role: string;
  plan: string;
}

/** Injects the {@link UserContext} attached by `UserContextGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as UserContext;
  },
);
