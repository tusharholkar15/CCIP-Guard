# BridgeGuard Production Docker Deployment Guide

This document describes the local production-grade containerized deployment of the complete BridgeGuard security observability platform.

---

## 1. System Architecture

The production stack orchestrates **10 containerized services** within an isolated Docker bridge network (`bridgeguard-net`):

| Service | Container Name | Role | Host Port | Internal Port |
| :--- | :--- | :--- | :--- | :--- |
| **postgres** | `bridgeguard-postgres` | PostgreSQL 16 database | *None (isolated)* | `5432` |
| **redis** | `bridgeguard-redis` | Redis 7 event pub/sub & BullMQ queue | *None (isolated)* | `6379` |
| **api** | `bridgeguard-api` | Fastify REST & WebSocket API | `3001` | `3001` |
| **indexer** | `bridgeguard-indexer` | Real CCIP on-chain log indexer | *None (background)* | — |
| **worker-metrics** | `bridgeguard-worker-metrics` | Latency & throughput metric calculator | *None (background)* | — |
| **worker-alerts** | `bridgeguard-worker-alerts` | Security risk & threshold detector | *None (background)* | — |
| **worker-responses** | `bridgeguard-worker-responses` | Automated response proposal handler | *None (background)* | — |
| **web** | `bridgeguard-web` | Next.js 14 frontend dashboard | `3000` | `3000` |
| **prometheus** | `bridgeguard-prometheus` | Prometheus metric scraper (`api:3001`) | *None (isolated)* | `9090` |
| **grafana** | `bridgeguard-grafana` | Metric visualization dashboards | `3002` | `3000` |

---

## 2. Security & Network Isolation

1. **Database & Cache Isolation**: PostgreSQL and Redis are accessible **only** within the internal Docker network (`bridgeguard-net`). No database or cache ports are exposed to the host machine.
2. **Prometheus Isolation**: Prometheus scrapes the API directly using internal Docker DNS (`http://api:3001/metrics`) and is accessed through Grafana on port 3002 without exposing port 9090 to the host.
3. **Frontend & API Access**: The Next.js web application is accessible at `http://localhost:3000`, the Fastify API at `http://localhost:3001`, and Grafana at `http://localhost:3002`.

---

## 3. Required Environment Variables

All variables are configured with production-grade defaults in `docker-compose.production.yml` and can be overridden via a `.env` file in the project root:

| Variable | Description | Default in Production Compose |
| :--- | :--- | :--- |
| `POSTGRES_USER` | PostgreSQL superuser username | `bridgeguard` |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `bridgeguard` |
| `POSTGRES_DB` | PostgreSQL database name | `bridgeguard` |
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://bridgeguard:bridgeguard@postgres:5432/bridgeguard` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `API_PORT` | Port exposed by Fastify API | `3001` |
| `API_KEY` | Secret token for `/api` requests | `your-api-key-here` |
| `LOG_LEVEL` | Fastify logging level (`info`, `debug`, etc.) | `info` |
| `CORS_ORIGIN` | Allowed CORS origins for API | `*` |
| `NEXT_PUBLIC_API_URL` | API endpoint accessed by browser | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint accessed by browser | `ws://localhost:3001` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment indicator (`mainnet` / `testnet`) | `mainnet` |
| `GRAFANA_PORT` | Host port for Grafana dashboard | `3002` |
| `GRAFANA_ADMIN_USER` | Grafana admin username | `admin` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | `bridgeguard` |
| `ETHEREUM_RPC_URL` | Ethereum mainnet JSON-RPC endpoint | `https://ethereum-rpc.publicnode.com` |
| `ARBITRUM_RPC_URL` | Arbitrum One JSON-RPC endpoint | `https://arb1.arbitrum.io/rpc` |
| `OPTIMISM_RPC_URL` | OP Mainnet JSON-RPC endpoint | `https://mainnet.optimism.io` |
| `BASE_RPC_URL` | Base Mainnet JSON-RPC endpoint | `https://mainnet.base.org` |
| `POLYGON_RPC_URL` | Polygon Mainnet JSON-RPC endpoint | `https://polygon-bor-rpc.publicnode.com` |
| `AVALANCHE_RPC_URL` | Avalanche C-Chain JSON-RPC endpoint | `https://api.avax.network/ext/bc/C/rpc` |
| `BNB_RPC_URL` | BNB Smart Chain JSON-RPC endpoint | `https://bsc-dataseed.binance.org` |

---

## 4. Deployment Instructions

### Step 1: Verify Monorepo Build
```bash
pnpm build
```

### Step 2: Validate Docker Compose Configuration
```bash
docker compose -f docker-compose.production.yml config
```

### Step 3: Build Production Docker Images
```bash
docker compose -f docker-compose.production.yml build
```

### Step 4: Launch the Full Stack
```bash
docker compose -f docker-compose.production.yml up -d
```

### Step 5: Verify Running Containers
```bash
docker compose -f docker-compose.production.yml ps
```

### Step 6: Inspect Logs
```bash
docker compose -f docker-compose.production.yml logs -f api
docker compose -f docker-compose.production.yml logs -f indexer
docker compose -f docker-compose.production.yml logs -f worker-metrics
docker compose -f docker-compose.production.yml logs -f worker-alerts
docker compose -f docker-compose.production.yml logs -f worker-responses
docker compose -f docker-compose.production.yml logs -f web
```

### Step 7: Teardown
```bash
# Stop containers without losing data
docker compose -f docker-compose.production.yml down

# Stop containers and remove volumes (clean wipe)
docker compose -f docker-compose.production.yml down -v
```
