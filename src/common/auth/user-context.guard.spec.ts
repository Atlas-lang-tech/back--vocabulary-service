import { beforeEach, describe, expect, it } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserContextGuard } from './user-context.guard.js';

/**
 * Fake `ExecutionContext` backed by a header map. The returned `request` is
 * mutated in place by the guard, so tests can assert `request.user`.
 */
function createContext(headers: Record<string, string>) {
  const request = {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('UserContextGuard', () => {
  let guard: UserContextGuard;

  beforeEach(() => {
    guard = new UserContextGuard();
  });

  it('throws Unauthorized when x-user-id is missing', () => {
    const { context } = createContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('attaches request.user from the gateway headers', () => {
    const { context, request } = createContext({
      'x-user-id': 'user-1',
      'x-user-role': 'ADMIN',
      'x-user-plan': 'PRO',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', role: 'ADMIN', plan: 'PRO' });
  });

  it('defaults role to USER and plan to FREE when those headers are absent', () => {
    const { context, request } = createContext({ 'x-user-id': 'user-2' });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-2', role: 'USER', plan: 'FREE' });
  });
});
