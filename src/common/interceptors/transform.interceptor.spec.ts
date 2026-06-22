import { describe, expect, it } from '@jest/globals';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor.js';

/** Fake `ExecutionContext` whose response reports a fixed `statusCode`. */
function createContext(statusCode = 200) {
  return {
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  } as unknown as ExecutionContext;
}

/** Fake `CallHandler` emitting a single value through the rxjs pipeline. */
function createHandler(value: unknown): CallHandler {
  return { handle: () => of(value) } as CallHandler;
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps a plain value in the response envelope', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(createContext(201), createHandler({ id: 1 })),
    );

    expect(result).toEqual({
      code: 201,
      message: 'Success',
      data: { id: 1 },
    });
  });

  it('coerces null/undefined data to an empty object', async () => {
    const fromNull = await lastValueFrom(
      interceptor.intercept(createContext(200), createHandler(null)),
    );
    const fromUndefined = await lastValueFrom(
      interceptor.intercept(createContext(200), createHandler(undefined)),
    );

    expect(fromNull.data).toEqual({});
    expect(fromUndefined.data).toEqual({});
  });

  it('passes through a value that is already enveloped', async () => {
    const envelope = { code: 404, message: 'Not found', data: {} };

    const result = await lastValueFrom(
      interceptor.intercept(createContext(200), createHandler(envelope)),
    );

    expect(result).toBe(envelope);
  });
});
