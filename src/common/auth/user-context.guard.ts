import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Identity derived from the headers Traefik's ForwardAuth injects after a
 * successful `/verify`. This service never authenticates — it only reads what
 * the gateway already validated.
 */
export interface UserContext {
  id: string;
  role: string;
  plan: string;
}

declare module 'express' {
  interface Request {
    user?: UserContext;
  }
}

/**
 * Reads identity from headers set by Traefik ForwardAuth (`X-User-Id`,
 * `X-User-Role`, `X-User-Plan`) and attaches `request.user`. Applied to private
 * routes only — the gateway guarantees the header is present after auth, so a
 * missing `X-User-Id` means the request bypassed the gateway → 401. Role/plan
 * fall back to sane defaults.
 */
@Injectable()
export class UserContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const id = request.header('x-user-id');
    if (!id) {
      throw new UnauthorizedException('Missing user context');
    }

    request.user = {
      id,
      role: request.header('x-user-role') ?? 'USER',
      plan: request.header('x-user-plan') ?? 'FREE',
    };

    return true;
  }
}
