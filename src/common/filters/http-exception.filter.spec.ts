import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

/**
 * Builds a fake `ArgumentsHost` whose response exposes chainable `status()` and
 * `json()` spies, mirroring the Express response the filter writes to.
 */
function createHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('preserves status and message for a string HttpException response', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Word not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.NOT_FOUND,
      message: 'Word not found',
      data: {},
    });
  });

  it('uses the first element of an array message (ValidationPipe shape)', () => {
    const { host, json } = createHost();

    filter.catch(
      new BadRequestException(['name must be a string', 'name is required']),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'name must be a string',
      data: {},
    });
  });

  it('maps Prisma P2002 to 409 with the joined target fields', () => {
    const { host, status, json } = createHost();

    filter.catch(
      {
        code: 'P2002',
        clientVersion: '7.5.0',
        meta: { target: ['email', 'username'] },
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.CONFLICT,
      message: 'Unique constraint failed on the fields: email, username',
      data: {},
    });
  });

  it('falls back to "unknown fields" when P2002 target is not an array', () => {
    const { host, json } = createHost();

    filter.catch({ code: 'P2002', clientVersion: '7.5.0', meta: {} }, host);

    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.CONFLICT,
      message: 'Unique constraint failed on the fields: unknown fields',
      data: {},
    });
  });

  it('maps Prisma P2025 to 404', () => {
    const { host, status, json } = createHost();

    filter.catch({ code: 'P2025', clientVersion: '7.5.0' }, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.NOT_FOUND,
      message: 'Record to update/delete not found',
      data: {},
    });
  });

  it('maps other Prisma codes to 400 with the last line of the message', () => {
    const { host, status, json } = createHost();

    filter.catch(
      {
        code: 'P2003',
        clientVersion: '7.5.0',
        message: 'Invalid invocation\nForeign key constraint failed',
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'Foreign key constraint failed',
      data: {},
    });
  });

  it('maps a plain Error to 500 with its message', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('something exploded'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'something exploded',
      data: {},
    });
  });

  it('maps an unknown throw to a generic 500', () => {
    const { host, status, json } = createHost();

    filter.catch('not an error', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      data: {},
    });
  });
});
