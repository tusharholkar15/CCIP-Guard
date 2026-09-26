import { db, schema } from '@bridgeguard/database';
import { desc, count } from 'drizzle-orm';

async function main() {
  const total = await db.select({ c: count() }).from(schema.ccipMessages);
  console.log('Total ccipMessages:', total[0].c);

  const msgs = await db.query.ccipMessages.findMany({
    orderBy: [desc(schema.ccipMessages.sourceBlockNumber)],
    limit: 15
  });
  for (const m of msgs) {
    console.log(`${m.messageId} | tx: ${m.sourceTxHash} | block: ${m.sourceBlockNumber} | sender: ${m.sender} | status: ${m.state} | created: ${m.createdAt?.toISOString()}`);
  }
  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
