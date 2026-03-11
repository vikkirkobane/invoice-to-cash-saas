import { db } from '@invoice/db';
import { customers, invoices } from '@invoice/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function listCustomers(tenantId: string, search?: string, includeArchived: boolean = false) {
  const where = eq(customers.tenantId, tenantId);
  if (!includeArchived) {
    // archivedAt null means active
  }

  return db.query.customers.findMany({
    where,
    orderBy: [desc(customers.createdAt)],
  });
}

export async function getCustomer(tenantId: string, customerId: string) {
  return db.query.customers.findFirst({
    where: and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)),
  });
}

export async function createCustomer(tenantId: string, data: any) {
  return db.insert(customers).values({ ...data, tenantId }).returning();
}

export async function updateCustomer(tenantId: string, customerId: string, data: any) {
  return db.update(customers).set(data).where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId))).returning();
}

export async function archiveCustomer(tenantId: string, customerId: string) {
  return db.update(customers).set({ archivedAt: new Date() }).where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId))).returning();
}