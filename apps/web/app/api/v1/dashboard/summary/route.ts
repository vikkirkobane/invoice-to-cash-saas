import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { invoices, payments } from '@invoice/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * GET /api/v1/dashboard/summary
 * Returns aggregated financial metrics for the tenant's dashboard.
 *
 * Response JSON:
 * {
 *   outstanding: string,
 *   overdue: string,
 *   collectedThisMonth: string,
 *   sentThisMonth: number
 * }
 */
export async function GET() {
  const session = await getServerSession(auth);
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });
  }

  const tenantId = session.user.tenantId;

  const outstanding = await db.$queryAsync<{ sum: string }[]>(sql`
    SELECT COALESCE(SUM(${sql.raw('total - amount_paid')}), 0) as sum
    FROM invoices
    WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'cancelled')
  `);
  const overdue = await db.$queryAsync<{ sum: string }[]>(sql`
    SELECT COALESCE(SUM(${sql.raw('total - amount_paid')}), 0) as sum
    FROM invoices
    WHERE tenant_id = ${tenantId} AND status = 'overdue'
  `);
  const collectedThisMonth = await db.$queryAsync<{ sum: string }[]>(sql`
    SELECT COALESCE(SUM(amount), 0) as sum
    FROM payments
    WHERE tenant_id = ${tenantId}
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
  `);
  const sentThisMonth = await db.$queryAsync<{ count: number }[]>(sql`
    SELECT COUNT(*) as count
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND EXTRACT(YEAR FROM sent_at) = EXTRACT(YEAR FROM NOW())
      AND EXTRACT(MONTH FROM sent_at) = EXTRACT(MONTH FROM NOW())
  `);

  return NextResponse.json({
    outstanding: outstanding[0]?.sum || '0',
    overdue: overdue[0]?.sum || '0',
    collectedThisMonth: collectedThisMonth[0]?.sum || '0',
    sentThisMonth: sentThisMonth[0]?.count || 0,
  });
}