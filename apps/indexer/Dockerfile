FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/indexer/ ./apps/indexer/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @bridgeguard/indexer build

CMD ["node", "apps/indexer/dist/indexer.js"]
