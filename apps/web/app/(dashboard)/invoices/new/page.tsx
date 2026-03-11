'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceCreateSchema } from '@invoice/utils/schemas/invoice';
import type { z } from 'zod';
import { Button } from '@invoice/ui';
import { CustomerSelect } from '@/components/forms/customer-select'; // placeholder

type InvoiceForm = z.infer<typeof invoiceCreateSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceCreateSchema),
    defaultValues: {
      currency: 'USD',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  useEffect(() => {
    fetch('/api/v1/customers')
      .then(res => res.json())
      .then(json => setCustomers(json.data || []));
  }, []);

  async function onSubmit(data: InvoiceForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to create invoice');
      } else {
        router.push('/dashboard/invoices');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Invoice</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <CustomerSelect customers={customers} register={form.register} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Line Items</h3>
            {form.watch('lineItems').map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                <input
                  {...form.register(`lineItems.${idx}.description`)}
                  placeholder="Description"
                  className="border border-gray-300 rounded p-2"
                />
                <input
                  type="number"
                  step="any"
                  {...form.register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
                  placeholder="Qty"
                  className="border border-gray-300 rounded p-2"
                />
                <input
                  type="number"
                  step="any"
                  {...form.register(`lineItems.${idx}.unitPrice`, { valueAsNumber: true })}
                  placeholder="Price"
                  className="border border-gray-300 rounded p-2"
                />
                <Button type="button" variant="destructive" onClick={() => { /* remove */ }}>Remove</Button>
              </div>
            ))}
            <Button type="button" onClick={() => form.setValue('lineItems', [...form.getValues('lineItems'), { description: '', quantity: 1, unitPrice: 0 }])}>Add Line Item</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Type</label>
              <select {...form.register('discountType')} className="border border-gray-300 rounded p-2 w-full">
                <option value="">None</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Value</label>
              <input type="number" {...form.register('discountValue', { valueAsNumber: true })} className="border border-gray-300 rounded p-2 w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
            <input type="number" {...form.register('taxRate', { valueAsNumber: true })} className="border border-gray-300 rounded p-2 w-full" />
          </div>

          <div className="flex space-x-4">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Draft'}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}