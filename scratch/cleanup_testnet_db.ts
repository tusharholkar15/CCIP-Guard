import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, chains, lanes, messages, incidents, alerts, inArray, notInArray, or, like, ilike } from '../packages/database/src/index';

const VALID_MAINNET_CHAIN_IDS = [1, 42161, 10, 8453, 137, 43114, 56];

async function main() {
  console.log('=== CLEANING OBSOLETE TESTNET DATA FROM POSTGRESQL ===\n');

  // 1. Delete testnet lanes
  const deletedLanes = await db
    .delete(lanes)
    .where(
      or(
        notInArray(lanes.sourceChainId, VALID_MAINNET_CHAIN_IDS),
        notInArray(lanes.destinationChainId, VALID_MAINNET_CHAIN_IDS)
      )
    )
    .returning({ id: lanes.id, src: lanes.sourceChainName, dst: lanes.destinationChainName });
  console.log(`Deleted ${deletedLanes.length} obsolete testnet lanes:`);
  for (const l of deletedLanes) {
    console.log(`  - ${l.src} -> ${l.dst}`);
  }

  // 2. Delete testnet chains
  const deletedChains = await db
    .delete(chains)
    .where(notInArray(chains.chainId, VALID_MAINNET_CHAIN_IDS))
    .returning({ id: chains.id, chainId: chains.chainId, name: chains.name });
  console.log(`\nDeleted ${deletedChains.length} obsolete testnet chains:`);
  for (const c of deletedChains) {
    console.log(`  - ${c.name} (${c.chainId})`);
  }

  // 3. Delete testnet messages
  const deletedMessages = await db
    .delete(messages)
    .where(
      or(
        notInArray(messages.sourceChainId, VALID_MAINNET_CHAIN_IDS),
        notInArray(messages.destinationChainId, VALID_MAINNET_CHAIN_IDS)
      )
    )
    .returning({ id: messages.id, ccipMessageId: messages.ccipMessageId });
  console.log(`\nDeleted ${deletedMessages.length} obsolete testnet messages.`);

  // 4. Delete testnet incidents
  const deletedIncidents = await db
    .delete(incidents)
    .where(
      or(
        ilike(incidents.title, '%sepolia%'),
        ilike(incidents.title, '%testnet%'),
        ilike(incidents.description, '%sepolia%'),
        ilike(incidents.sourceChainName, '%sepolia%'),
        ilike(incidents.destinationChainName, '%sepolia%')
      )
    )
    .returning({ id: incidents.id, title: incidents.title });
  console.log(`\nDeleted ${deletedIncidents.length} obsolete testnet incidents:`);
  for (const inc of deletedIncidents) {
    console.log(`  - ${inc.title}`);
  }

  // 5. Delete testnet alerts
  const deletedAlerts = await db
    .delete(alerts)
    .where(
      or(
        ilike(alerts.resource, '%sepolia%'),
        ilike(alerts.resource, '%testnet%'),
        ilike(alerts.message, '%sepolia%'),
        ilike(alerts.message, '%testnet%')
      )
    )
    .returning({ id: alerts.id, resource: alerts.resource });
  console.log(`\nDeleted ${deletedAlerts.length} obsolete testnet alerts:`);
  for (const a of deletedAlerts) {
    console.log(`  - ${a.resource}`);
  }

  // Summary of remaining valid data
  const remainingChains = await db.select().from(chains);
  console.log(`\n=== REMAINING VALID MAINNET CHAINS (${remainingChains.length}) ===`);
  for (const c of remainingChains) {
    console.log(`  - ${c.displayName} (${c.chainId})`);
  }

  const remainingLanes = await db.select().from(lanes);
  console.log(`\n=== REMAINING VALID MAINNET LANES (${remainingLanes.length}) ===`);
  for (const l of remainingLanes) {
    console.log(`  - ${l.sourceChainName} -> ${l.destinationChainName}`);
  }

  const remainingMessages = await db.select().from(messages);
  console.log(`\n=== REMAINING VALID MAINNET MESSAGES (${remainingMessages.length}) ===`);

  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
