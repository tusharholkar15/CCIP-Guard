FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Build
RUN pnpm --filter @bridgeguard/api build

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
