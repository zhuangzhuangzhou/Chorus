# Dockerfile for Chorus

# Development stage
FROM node:22-alpine AS development

# Install OpenSSL for Prisma and enable corepack for pnpm
RUN apk add --no-cache openssl && corepack enable

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Expose port
EXPOSE 3000

# Development command (overridden in docker-compose)
CMD ["pnpm", "dev"]

# Production build stage
FROM node:22-alpine AS builder

# Install OpenSSL for Prisma and enable corepack for pnpm
RUN apk add --no-cache openssl && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install OpenSSL for Prisma runtime and enable corepack for pnpm
RUN apk add --no-cache openssl && corepack enable

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# public/skill/ already exists as standalone skill docs (served at /skill/ path)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/generated ./src/generated

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "start"]
