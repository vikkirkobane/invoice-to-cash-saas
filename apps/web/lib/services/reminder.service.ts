import { db } from '@invoice/db';
import { reminderTemplates, invoices, customers } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import { reminderQueue } from '@/lib/queue/reminder.queue';
import { EmailService } from '@/lib/services/email.service';

/**
 * Reminder service — schedules and processes automated email reminders
 * using Bull queue and template engine.
 */
export class ReminderService {
  /**
   * For a given invoice, enqueue reminder jobs for all active templates.
   * Each job is scheduled to run at (due_date + offset_days).
   *
   * @param invoiceId - Invoice to schedule reminders for
   * @param tenantId - Tenant ID (used to fetch templates)
   */
  static async scheduleForInvoice(invoiceId: string, tenantId: string) {
    const templates = await db.query.reminderTemplates.findMany({ where: eq(reminderTemplates.tenantId, tenantId) });
    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (!invoice) return;

    for (const tmpl of templates) {
      if (!tmpl.enabled) continue;
      const delay = new Date(invoice.dueDate).getTime() + tmpl.offsetDays * 24 * 60 * 60 * 1000 - Date.now();
      await reminderQueue.add('send-reminder', { invoiceId, templateId: tmpl.id }, { delay: Math.max(0, delay) });
    }
  }

  /**
   * Cancel all pending reminder jobs for an invoice.
   * Called when an invoice is paid or cancelled.
   *
   * @param invoiceId - Invoice to cancel reminders for
   */
  static async cancelForInvoice(invoiceId: string) {
    const jobs = await reminderQueue.getJobs(['waiting', 'delayed']);
    const toRemove = jobs.filter(j => j.data.invoiceId === invoiceId);
    await Promise.all(toRemove.map(j => j.remove()));
  }

  /**
   * Bull job processor — renders reminder email template and sends.
   * Merge tags: {{customer_name}}, {{invoice_number}}, {{amount_due}}, {{due_date}}, {{payment_link}}.
   *
   * @param job - Bull job data containing invoiceId and templateId
   */
  static async processJob(job: any) {
    const { invoiceId, templateId } = job.data;
    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    const template = await db.query.reminderTemplates.findFirst({ where: eq(reminderTemplates.id, templateId) });
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, invoice.customerId) });

    if (invoice && template && customer) {
      const html = template.body
        .replace(/{customer_name}/g, customer.name)
        .replace(/{invoice_number}/g, invoice.invoiceNumber)
        .replace(/{amount_due}/g, (invoice.total - invoice.amountPaid).toFixed(2))
        .replace(/{due_date}/g, new Date(invoice.dueDate).toLocaleDateString())
        .replace(/{payment_link}/g, `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.paymentToken}`);
      await EmailService.send(customer.email, template.subject, html);
    }
  }
}