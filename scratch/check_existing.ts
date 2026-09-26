import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { db, ccipEvents, messages } from '@bridgeguard/database';
import { desc } from 'drizzle-orm';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { arbitrum } from 'viem/chains';

async function main() {
  console.log('=== 1. CHECK POSTGRESQL CCIP EVENTS & MESSAGES ===');
  const dbEvents = await db.select().from(ccipEvents).orderBy(desc(ccipEvents.blockNumber)).limit(10);
  console.log('PostgreSQL ccipEvents count:', dbEvents.length);
  for (const e of dbEvents) {
    console.log(JSON.stringify(e, null, 2));
  }

  const dbMessages = await db.select().from(messages).orderBy(desc(messages.updatedAt)).limit(10);
  console.log('PostgreSQL messages count:', dbMessages.length);
  for (const m of dbMessages) {
    console.log({
      id: m.id,
      ccipMessageId: m.ccipMessageId,
      sourceChainId: m.sourceChainId,
      destinationChainId: m.destinationChainId,
      state: m.state,
      sender: m.sender,
      receiver: m.receiver,
      txHash: m.sourceTransactionHash
    });
  }
}

main().catch(console.error);
