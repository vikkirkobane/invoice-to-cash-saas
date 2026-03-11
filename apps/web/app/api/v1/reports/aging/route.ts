import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { customers, invoices } from '@invoice/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const tenantId = session.user.tenantId;

  // Find invoices that are sent or viewed and overdue
  const overdueInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), sql`${invoices.status} IN ('sent', 'viewed') AND ${invoices.due_date} < NOW() AND ${invoices.amount_paid} < ${invoices.total}`),
    with: { customer: true },
  });

  // Bucket
  const buckets = { '1-30': [], '31-60': [], '60+': [] };
  for (const inv of overdueInvoices) {
    const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? '1-30' : days <= 60 ? '31-60' : '60+';
    (buckets[bucket as keyof typeof buckets] as any[]).push(inv);
  }

  // For simplicity, return flat list with bucket label
  const rows = overdueInvoices.map(inv => {
    const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? '1-30' : days <= 60 ? '31-60' : '60+';
    return {
      customerName: inv.customer?.name,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      daysOverdue: days,
      amountDue: Number(inv.total) - Number(inv.amountPaid),
      bucket,
    };
  });

  return NextResponse.json({ data: rows });
}

export async function GET_EXPORT(req: Request) {
  // CSV export
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  // Reuse logic from GET
  const data = await GET(req);
  const rows = (data as any).data;

  const csv = [
    ['Customer', 'Invoice #', 'Issue Date', 'Due Date', 'Days Overdue', 'Amount Due'].join(','),
    ...rows.map((r: any) => [r.customerName, r.invoiceNumber, r.issueDate, r.dueDate, r.daysOverdue, r.amountDue].join(',')),
  ].join('\n');

  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="aging-report.csv"' },
  });
}