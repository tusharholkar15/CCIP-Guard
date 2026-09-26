# BridgeGuard

**Cross-Chain Security Observability Platform**

BridgeGuard provides real-time visibility into cross-chain message lifecycles, network health, incidents, alerts, and controlled response operations.

> **Note:** BridgeGuard is an independent observability platform. It is NOT an official Chainlink product and is not owned, operated, or endorsed by Chainlink Labs.

## Architecture

```
Blockchain Networks (Ethereum Sepolia, Arbitrum Sepolia)
         ↓
   CCIP Event Indexer (viem)
         ↓
   Redis Event Bus (BullMQ)
         ↓
   Workers (Metrics, Alerts, Responses)
         ↓
   PostgreSQL (Drizzle ORM)
         ↓
   Fastify API + WebSocket
         ↓
   BridgeGuard Dashboard (Next.js)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | Fastify, TypeScript |
| Blockchain | viem, Chainlink CCIP events |
| Database | PostgreSQL, Drizzle ORM |
| Cache/Queue | Redis, BullMQ |
| Observability | Prometheus, Grafana |
| Infrastructure | Docker, Docker Compose |
| Monorepo | pnpm workspaces, Turborepo |

## Project Structure

```
ccip-Guard/
├── apps/
│   ├── api/          # Fastify REST API + WebSocket
│   ├── web/          # Next.js frontend
│   ├── indexer/      # CCIP event indexer
│   └── workers/      # Metrics, alert, response workers
├── packages/
│   ├── shared/       # Shared types, constants, utilities
│   ├── database/     # Drizzle ORM schema
│   └── redis/        # Redis client, event bus, queues
├── infra/
│   ├── postgres/     # Database init script
│   ├── prometheus/   # Prometheus config
│   └── grafana/      # Grafana dashboards
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9.4.0
- Docker & Docker Compose

### 1. Clone and configure

```bash
git clone <repo-url> bridgeguard
cd bridgeguard
cp .env.example .env
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, Prometheus, and Grafana.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start development

```bash
pnpm dev
```

This starts:
- **API** at http://localhost:3001
- **Web** at http://localhost:3000
- **Indexer** (requires RPC URLs in .env)
- **Workers** (metrics, alerts, responses)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://bridgeguard:bridgeguard@localhost:5432/bridgeguard` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `SEPOLIA_RPC_URL` | Ethereum Sepolia RPC | Required for indexing |
| `ARBITRUM_SEPOLIA_RPC_URL` | Arbitrum Sepolia RPC | Required for indexing |
| `API_PORT` | API server port | `3001` |
| `API_KEY` | API authentication key | Optional in dev |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | Frontend WebSocket URL | `ws://localhost:3001` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/chains` | List chains |
| GET | `/api/lanes` | List CCIP lanes |
| GET | `/api/messages` | List messages (paginated) |
| GET | `/api/messages/:id` | Message details |
| GET | `/api/incidents` | List incidents |
| PATCH | `/api/incidents/:id` | Update incident |
| GET | `/api/alerts` | List alerts |
| PATCH | `/api/alerts/:id` | Update alert |
| GET | `/api/responses` | List response proposals |
| POST | `/api/responses` | Create proposal |
| POST | `/api/responses/:id/approve` | Approve proposal |
| POST | `/api/responses/:id/reject` | Reject proposal |
| GET | `/api/audit` | List audit logs |
| WS | `/ws` | WebSocket real-time updates |

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Public landing page |
| `/architecture` | Architecture diagram |
| `/docs` | Documentation |
| `/about` | About BridgeGuard |
| `/overview` | Dashboard overview |
| `/network` | Network topology |
| `/messages` | Message tracking |
| `/lanes` | CCIP lane monitoring |
| `/incidents` | Incident management |
| `/alerts` | Alert management |
| `/responses` | Response operations |
| `/audit` | Audit timeline |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and event bus |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3002 | Metrics dashboards |

## Development Commands

```bash
pnpm dev          # Start all services in development
pnpm build        # Build all packages
pnpm lint         # Run linting
pnpm typecheck    # TypeScript checking
pnpm test         # Run tests
pnpm clean        # Clean build artifacts
```

## Security

- API authentication via `x-api-key` header
- Operator authorization via `x-operator-role` and `x-operator-id` headers
- Response proposals require operator approval
- Execution mode defaults to DISABLED/SIMULATION
- All actions are audit-logged
- No secrets committed to repository

## Observability

- **Prometheus** scrapes API metrics at `/metrics`
- **Grafana** dashboard at http://localhost:3002 (admin/bridgeguard)
- Metrics include: HTTP request rate, duration, WebSocket connections, messages indexed

## License

MIT
