import { jest } from '@jest/globals';

/**
 * Test doubles for PrismaService / RedisService. These are plain objects of
 * jest mocks — services are instantiated directly with them
 * (`new XxxService(createMockPrisma() as any, createMockRedis() as any)`),
 * so no real database or Redis connection is ever opened in unit tests.
 *
 * Excluded from the production build via tsconfig.build.json (`**\/testing\/**`).
 *
 * When you add a domain model, add a `createModelMock()` entry for it to
 * `createMockPrisma()` (and to the `MockPrisma` interface) so specs can stub it.
 */

// Permissive signature so `mockResolvedValue`/`mockReturnValue` accept any
// stubbed entity without casts (the default `jest.Mock` returns a non-Promise
// `unknown`, which makes `mockResolvedValue` expect `never`).
type AnyAsyncFn = (...args: any[]) => any;
type ModelMethod = jest.Mock<AnyAsyncFn>;

export type Model = {
  findUnique: ModelMethod;
  findFirst: ModelMethod;
  findMany: ModelMethod;
  create: ModelMethod;
  update: ModelMethod;
  delete: ModelMethod;
  deleteMany: ModelMethod;
};

export function createModelMock(): Model {
  return {
    findUnique: jest.fn<AnyAsyncFn>(),
    findFirst: jest.fn<AnyAsyncFn>(),
    findMany: jest.fn<AnyAsyncFn>(),
    create: jest.fn<AnyAsyncFn>(),
    update: jest.fn<AnyAsyncFn>(),
    delete: jest.fn<AnyAsyncFn>(),
    deleteMany: jest.fn<AnyAsyncFn>(),
  };
}

export interface MockPrisma {
  dictionary: Model;
  $transaction: jest.Mock;
}

export function createMockPrisma(): MockPrisma {
  const prisma = {
    dictionary: createModelMock(),

    // By default run the interactive-transaction callback against the same
    // mock client, so two-pass reorder/sync logic executes inline.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return prisma;
}

export interface MockRedis {
  get: jest.Mock<AnyAsyncFn>;
  set: jest.Mock<AnyAsyncFn>;
  del: jest.Mock<AnyAsyncFn>;
  exists: jest.Mock<AnyAsyncFn>;
  expire: jest.Mock<AnyAsyncFn>;
  keys: jest.Mock<AnyAsyncFn>;
}

export function createMockRedis(): MockRedis {
  return {
    // Default to a cache miss; individual tests override per case.
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve(undefined)),
    del: jest.fn(() => Promise.resolve(1)),
    exists: jest.fn(() => Promise.resolve(false)),
    expire: jest.fn(() => Promise.resolve(undefined)),
    keys: jest.fn(() => Promise.resolve([])),
  };
}
