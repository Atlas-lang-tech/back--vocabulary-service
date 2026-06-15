# =========================
# 1. Build stage
# =========================
FROM node:20-alpine AS build

WORKDIR /app

# For native dependencies
RUN apk add --no-cache bash python3 make g++

# Install pnpm
RUN npm install -g pnpm

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (dev + prod)
RUN pnpm install

# Copy the rest of the source
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build NestJS
RUN pnpm build

# =========================
# 2. Production stage
# =========================
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/generated ./generated
COPY package.json ./
COPY prisma.config.ts ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start:prod"]
