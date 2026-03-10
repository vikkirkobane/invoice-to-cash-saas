// Drizzle client singleton
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'postgres';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from './schema';