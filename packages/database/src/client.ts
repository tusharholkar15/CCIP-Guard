import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Ensure BigInt values (e.g. sequenceNumber, gasUsed) serialize cleanly to JSON
if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const connectionString = process.env.DATABASE_URL || 'postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard';

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
