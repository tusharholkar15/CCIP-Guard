import { db, messages, ccipEvents } from '@bridgeguard/database';
import { desc } from 'drizzle-orm';

async function main() {
  console.log('--- BridgeGuard Mainnet Validation DB Query ---');
  
  const events = await db.select().from(ccipEvents).orderBy(desc(ccipEvents.blockNumber)).limit(10);
  console.log(`Found ${events.length} CCIP Events in database.`);
  
  if (events.length > 0) {
    console.log('\nLatest events:');
    events.slice(0, 3).forEach(e => {
      console.log(`- [${e.eventType}] Block: ${e.blockNumber} TX: ${e.transactionHash}`);
      console.log(`  Message ID: ${e.messageId}`);
    });
  }

  const msgs = await db.select().from(messages).orderBy(desc(messages.updatedAt)).limit(10);
  console.log(`\nFound ${msgs.length} CCIP Messages in database.`);
  if (msgs.length > 0) {
    console.log('\nLatest messages:');
    msgs.slice(0, 3).forEach(m => {
      console.log(`- Message ID: ${m.ccipMessageId}`);
      console.log(`  State: ${m.state}`);
      console.log(`  Source Chain: ${m.sourceChainId} | Dest Chain: ${m.destinationChainId}`);
    });
  }

  process.exit(0);
}

main().catch(console.error);
