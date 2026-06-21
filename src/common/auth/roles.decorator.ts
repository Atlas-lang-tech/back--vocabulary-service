import { Reflector } from '@nestjs/core';

/**
 * Restricts a route to the given roles. Enforced by `RolesGuard`, which reads
 * `request.user.role` (set by `UserContextGuard`). Usage: `@Roles([Role.ADMIN])`.
 */
export const Roles = Reflector.createDecorator<string[]>();
