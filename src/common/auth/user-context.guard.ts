import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { UserContext } from './current-user.decorator.js';

/**
 * Reads the identity headers injected by the gateway (Traefik ForwardAuth) and
 * attaches a {@link UserContext} to the request. There is no token validation
 * here — trust is established upstream; this guard only requires that the
 * gateway forwarded an `X-User-Id`. Role/plan fall back to sane defaults.
 */
@Injectable()
export class UserContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const headers = req.headers ?? {};

    const userId = headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Missing X-User-Id header');
    }

    const role =
      typeof headers['x-user-role'] === 'string'
        ? headers['x-user-role']
        : 'USER';
    const plan =
      typeof headers['x-user-plan'] === 'string'
        ? headers['x-user-plan']
        : 'FREE';

    req.user = { userId, role, plan } satisfies UserContext;
    return true;
  }
}
