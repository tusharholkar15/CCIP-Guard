FROM node:20-alpine AS base
RUN apk add --no-cache git openssh && npm install -g pnpm@9.4.0
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm config set fetch-retries 5 && pnpm install --filter @bridgeguard/api...

# Build
RUN pnpm --filter @bridgeguard/api... build

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
