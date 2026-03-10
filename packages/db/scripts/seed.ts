import { db } from '../src/index';
import { tenants, users } from '../src/schema';
import { randomUUID } from 'crypto';

async function seed() {
  // Create a test tenant
  const tenant = await db.insert(tenants).values({
    name: 'Acme Corp',
    slug: 'acme-corp',
    defaultCurrency: 'USD',
    defaultPaymentTerms: 30,
  }).returning().first();

  if (!tenant) throw new Error('Failed to create tenant');

  // Create owner user
  const owner = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'owner@example.com',
    hashedPassword: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/zCpM2gQ2m', // 'password'
    role: 'owner',
    emailVerified: true,
  }).returning().first();

  console.log('Seeded:', { tenant, owner });
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});