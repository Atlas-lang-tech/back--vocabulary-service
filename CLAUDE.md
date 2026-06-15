# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

NestJS 11 backend ("vocabulary service") for a language-learning platform. PostgreSQL via Prisma 7 (custom driver adapter), Redis for caching. Package manager is **pnpm**. This service follows the same architecture and conventions as the other NestJS services on the platform — see `CONVENTIONS.md` for the full template/checklist.

The domain (feature modules) is not yet defined: the repository currently contains only the shared skeleton (config infrastructure, Prisma/Redis modules, response envelope, error filter). Add feature modules per the checklist at the bottom of `CONVENTIONS.md`.

## Commands

```bash
pnpm install                # install deps
pnpm start:dev              # run with watch (development)
pnpm start:prod             # run compiled build (node dist/src/main)
pnpm build                  # nest build → dist/
pnpm lint                   # eslint --fix over {src,apps,libs,test}
pnpm format                 # prettier --write

pnpm test                   # jest unit tests (*.spec.ts under src/)
pnpm test:watch
pnpm test:cov
pnpm jest path/to/file.spec.ts   # run a single test file

pnpm prisma generate        # regenerate client into generated/prisma (REQUIRED after schema edits)
pnpm prisma migrate dev --name <name>   # create + apply a migration
pnpm prisma migrate deploy  # apply migrations (run automatically by the container on startup)

docker compose up -d        # local Postgres (vocabulary) + Redis
```

The app boots on `PORT` (default 3000). Swagger UI is served at `/docs`.

## Critical conventions

- **ESM project.** `package.json` has `"type": "module"`. All relative imports **must** use explicit `.js` extensions even though the source is `.ts` (e.g. `import { setupApp } from './common/setup-app.js'`). Follow this in every new file or the build/runtime breaks.
- **Prisma client is custom-generated, not `@prisma/client`.** The generator (`prisma/schema.prisma`) outputs to `generated/prisma` (gitignored). Import `PrismaClient` from the generated client (e.g. `../../../generated/prisma/client.js`), not the package. `PrismaService` extends it and wires the `@prisma/adapter-pg` driver adapter with `DATABASE_URL` **before** `super()`. Always run `pnpm prisma generate` after pulling or changing the schema.
- **Database table/model naming:** Prisma models are camelCase singular and `@@map` to snake_case plural SQL tables (e.g. `model languageLvl { ... @@map("language_lvls") }`). If you import models/typos from a shared schema, match them exactly — don't "fix" names, or you'll diverge from the database.

## Architecture

### Response envelope (applied globally in `src/main.ts` via `common/setup-app.ts`)
- `TransformInterceptor` (`src/common/interceptors/`) wraps **every** controller return value into `{ code, message, data }`. Controllers return raw entities; do not build the envelope yourself. If a value is already `{ code, message, data }`, it is not re-wrapped.
- `HttpExceptionFilter` (`src/common/filters/`) catches everything and emits the same `{ code, message, data }` shape. Prisma special-cases: `P2002` → 409 Conflict, `P2025` → 404 Not Found, other Prisma codes → 400 Bad Request; `HttpException` keeps its status; any other `Error` → 500 with `error.message`.
- **Throw Nest exceptions in services** (`NotFoundException`, `ConflictException`, `BadRequestException`) — the filter formats them. The global `ValidationPipe` (`whitelist + transform`) is wired in `setup-app.ts`, so `class-validator` decorators on DTOs are enforced automatically.
- Global prefix is `api/vocabulary` (set in `common/setup-app.ts`), so controller routes are served under `/api/vocabulary/...`.

### Feature module pattern
Each domain is a self-contained NestJS module: `*.module.ts`, `*.service.ts`, controllers, and `dto/`. Modules import `PrismaModule`; `RedisModule` is `@Global`, so `RedisService` is injectable everywhere without importing it. Register each new module in `src/app.module.ts → imports`.

- **Public vs private controllers:** split into `*.public.controller.ts` (read-only, routed under `public/<domain>`) and `*.private.controller.ts` (CRUD, under `private/<domain>`). There is currently **no auth guard** enforcing this split — it is a routing convention only.
- **Controllers are thin:** delegate to the service, parse ids with `ParseIntPipe`, validate bodies via DTOs. For delete return `{ message: 'Xxx deleted successfully' }`.

### Caching pattern (cache-aside)
Services cache through `RedisService` (ioredis wrapper: `get/set/del/exists/expire/keys`). Convention: a per-service `cacheKey` prefix (e.g. `word:`), keys like `word:all`, `word:<id>`, TTL 3600s. **On every create/update/delete, invalidate the affected keys (including `:all`) via a private `invalidate(...)`** after the DB write. On update, invalidate both the old and the new entity (relation buckets may have changed).

### Configuration
`ConfigModule.forRoot({ isGlobal: true, validate })` runs `src/common/env.validation.ts`, which validates required env vars at boot and throws if any are missing/invalid: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` (required), `REDIS_PASSWORD` (optional). Add new required env vars to that class.

### Tests (Jest, ESM)
`*.spec.ts` files live next to the code under `src/`. Services are instantiated **directly with mocks** (`new XxxService(createMockPrisma() as any, createMockRedis() as any)`) — no `Test.createTestingModule`. Mocks live in `src/common/testing/mocks.ts`; `createMockRedis()` defaults to a cache miss (`get → null`). `testing/**` and `dto/**` are excluded from coverage and the production build. Imports in tests also use `.js`; `moduleNameMapper` maps `.js` → `.ts`.

## Deployment

Multi-stage `dockerfile` builds with pnpm, runs `prisma generate` + `pnpm build`, and the production container starts with `npx prisma migrate deploy && pnpm start:prod` (migrations apply on startup). CI (`.github/workflows/`) builds and pushes a multi-arch image to GHCR on pushes to the `prod` branch and on `v*` tags. The default working branch is `prod`.
