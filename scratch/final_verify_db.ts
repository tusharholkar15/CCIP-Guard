import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, chains, lanes, messages, incidents, alerts, ilike, or } from '../packages/database/src/index';

async function main() {
  console.log('=== FINAL DATABASE HEALTH VERIFICATION ===\n');

  // Chains
  const chainRows = await db.select().from(chains);
  console.log(`Chains count: ${chainRows.length} (expected: 7)`);
  for (const c of chainRows) {
    console.log(`  - [${c.chainId}] ${c.displayName}`);
  }

  // Lanes
  const laneRows = await db.select().from(lanes);
  console.log(`\nLanes count: ${laneRows.length} (expected: 42)`);

  const testnetLanes = laneRows.filter(
    l => l.sourceChainName.toLowerCase().includes('sepolia') || 
         l.destinationChainName.toLowerCase().includes('sepolia') ||
         l.sourceChainName.toLowerCase().includes('testnet') ||
         l.destinationChainName.toLowerCase().includes('testnet')
  );
  console.log(`Testnet/Sepolia lanes count: ${testnetLanes.length} (expected: 0)`);

  // Incidents
  const incRows = await db.select().from(incidents);
  const testnetIncidents = incRows.filter(
    i => (i.title && (i.title.includes('Sepolia') || i.title.includes('testnet'))) ||
         (i.sourceChainName && i.sourceChainName.includes('Sepolia')) ||
         (i.destinationChainName && i.destinationChainName.includes('Sepolia'))
  );
  console.log(`\nActive/Open Incidents count: ${incRows.length}`);
  console.log(`Testnet/Sepolia incidents count: ${testnetIncidents.length} (expected: 0)`);

  // Alerts
  const alertRows = await db.select().from(alerts);
  const testnetAlerts = alertRows.filter(
    a => (a.resource && (a.resource.includes('Sepolia') || a.resource.includes('testnet'))) ||
         (a.message && (a.message.includes('Sepolia') || a.message.includes('testnet')))
  );
  console.log(`\nAlerts count: ${alertRows.length}`);
  console.log(`Testnet/Sepolia alerts count: ${testnetAlerts.length} (expected: 0)`);

  // Messages
  const msgRows = await db.select().from(messages);
  const testnetMessages = msgRows.filter(
    m => m.sourceChainName.toLowerCase().includes('sepolia') ||
         m.destinationChainName.toLowerCase().includes('sepolia') ||
         m.sourceChainName.toLowerCase().includes('testnet') ||
         m.destinationChainName.toLowerCase().includes('testnet')
  );
  console.log(`\nMessages count: ${msgRows.length}`);
  console.log(`Testnet/Sepolia messages count: ${testnetMessages.length} (expected: 0)`);

  const allPassed = 
    chainRows.length === 7 && 
    laneRows.length === 42 && 
    testnetLanes.length === 0 && 
    testnetIncidents.length === 0 && 
    testnetAlerts.length === 0 && 
    testnetMessages.length === 0;

  console.log(`\nFINAL DB AUDIT: ${allPassed ? 'ALL VERIFICATIONS PASSED ✓' : 'FAILED ✗'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
