# BridgeGuard Architecture Audit Report

## 1. Existing CCIP Indexer
- **Location**: `apps/indexer/src/indexer.ts`, `ccip-watcher.ts`, `ccip-persister.ts`
- **Current State**: Uses `viem` to directly poll Ethereum Sepolia and Arbitrum Sepolia RPCs. Hardcodes OnRamp and OffRamp addresses for these testnets.
- **Event Listeners**: Watches for `CCIPSendRequested`, `CommitReportAccepted`, and `ExecutionStateChanged` events.

## 2. Chain Configuration
- **Location**: `packages/shared/src/constants/index.ts`
- **Current State**: Static `SUPPORTED_CHAINS` object containing only `ETHEREUM_SEPOLIA` and `ARBITRUM_SEPOLIA`. Uses hardcoded router, onRamp, and offRamp addresses. `CCIP_CHAIN_SELECTORS` maps a limited set of selectors.
- **RPC Configuration**: Uses `.env` variables `SEPOLIA_RPC_URL` and `ARBITRUM_SEPOLIA_RPC_URL`.

## 3. Database Schema
- **Location**: `packages/database/src/schema/index.ts`
- **Current State**: Drizzle ORM mapping to PostgreSQL.
- **Message Schema**: `messageStateEnum` is currently `['SENT', 'COMMITTED', 'EXECUTION_STARTED', 'DELIVERED', 'FAILED']`.
- **Entities**: Chains, Lanes, Messages, Incidents, Alerts, Response Proposals, Audit Logs, Checkpoints.

## 4. Message Correlation and Lifecycle
- **Location**: `apps/indexer/src/ccip-correlation.ts` and `ccip-persister.ts`
- **Current State**: Correlates based on `ccipMessageId`.

## 5. Workers and Redis Queues
- **Location**: `apps/workers/src`
- **Current State**: Contains metrics, alerts, and response workers using Redis Pub/Sub and Queues.

## 6. API Endpoints and Dashboard Data Fetching
- **Location**: `apps/api/src/routes`
- **Current State**: Provides endpoints like `/messages`, `/stats`, `/lanes`.
- **Mock/Demo Data**: Contains `simulation.ts` explicitly designed to inject mock/fake events for demonstration purposes.

## 7. Testnet-Specific Assumptions
- The indexer explicitly expects testnet blocks, wait times, and lanes.
- Hardcoded testnet chain IDs and names.
- The UI / API assumes success state is `DELIVERED` rather than the requested canonical `SUCCESS`.
