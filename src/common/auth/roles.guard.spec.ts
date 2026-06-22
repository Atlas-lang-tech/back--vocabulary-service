import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './roles.js';
import { RolesGuard } from './roles.guard.js';

/** Fake `Reflector` that returns the given roles for any handler/class. */
function createReflector(roles: string[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

/** Fake `ExecutionContext` whose request carries the given user role. */
function createContext(role?: string): ExecutionContext {
  const request = role ? { user: { role } } : {};
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the route when no @Roles metadata is present', () => {
    const guard = new RolesGuard(createReflector(undefined));

    expect(guard.canActivate(createContext(Role.USER))).toBe(true);
  });

  it('allows the route when @Roles is an empty list', () => {
    const guard = new RolesGuard(createReflector([]));

    expect(guard.canActivate(createContext(Role.USER))).toBe(true);
  });

  it('allows a user whose role is in the allowed list', () => {
    const guard = new RolesGuard(createReflector([Role.ADMIN, Role.MODERATOR]));

    expect(guard.canActivate(createContext(Role.ADMIN))).toBe(true);
  });

  it('forbids a user whose role is not allowed', () => {
    const guard = new RolesGuard(createReflector([Role.ADMIN]));

    expect(() => guard.canActivate(createContext(Role.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids a request with no role on it', () => {
    const guard = new RolesGuard(createReflector([Role.ADMIN]));

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});
