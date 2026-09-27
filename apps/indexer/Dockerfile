FROM node:20-alpine AS base
RUN apk add --no-cache git openssh && npm install -g pnpm@9.4.0
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/indexer/ ./apps/indexer/

RUN pnpm config set fetch-retries 5 && pnpm install --filter @bridgeguard/indexer...
RUN pnpm --filter @bridgeguard/indexer... build

CMD ["node", "apps/indexer/dist/indexer.js"]
