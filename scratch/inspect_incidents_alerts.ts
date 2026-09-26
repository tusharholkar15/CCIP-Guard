import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, incidents, alerts } from '../packages/database/src/index';

async function main() {
  try {
    const allIncidents = await db.select().from(incidents);
    console.log('INCIDENTS:', allIncidents.map(i => ({ id: i.id, title: i.title, src: i.sourceChainName, dst: i.destinationChainName })));

    const allAlerts = await db.select().from(alerts);
    console.log('ALERTS:', allAlerts.map(a => ({ id: a.id, resource: a.resource, message: a.message })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
