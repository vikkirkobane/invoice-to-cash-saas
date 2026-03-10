import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../src/index';

async function run() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});