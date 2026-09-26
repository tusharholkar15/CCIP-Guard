import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { db, messages, ccipEvents } from '@bridgeguard/database';
import { eq, or } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(messages).where(
    or(
      eq(messages.ccipMessageId, '0x9d97b7bcdede219b24587b6d8adac5f5d92f2b2f41b75bf42099d5ecde7d93e8'),
      eq(messages.ccipMessageId, '0xa3575271f688578970107570bd502aa450c31676bd338a99372088406911be24')
    )
  );

  console.log('Found rows in DB:', rows.length);
  for (const r of rows) {
    console.log(JSON.stringify(r, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  }
}

main().catch(console.error);
