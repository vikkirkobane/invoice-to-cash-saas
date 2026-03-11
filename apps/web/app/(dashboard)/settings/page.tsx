'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tenantSettingsSchema } from '@invoice/utils/schemas/tenant';
import type { z } from 'zod';
import { Button } from '@invoice/ui';
import { useState } from 'react';

type SettingsForm = z.infer<typeof tenantSettingsSchema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<SettingsForm>({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: {
      currency: 'USD',
      paymentTerms: 30,
    },
  });

  async function onSubmit(data: SettingsForm) {
    setLoading(true);
    setMessage(null);
    try {
      // TODO: call PATCH /api/v1/tenants/settings
      setMessage('Settings saved (placeholder)');
    } catch {
      setMessage('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <input type="text" {...form.register('companyName')} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select {...form.register('currency')} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="KES">KES</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Payment Terms (days)</label>
          <input
            type="number"
            {...form.register('paymentTerms', { valueAsNumber: true })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Invoice Number Format</label>
          <input
            type="text"
            {...form.register('invoiceNumberFormat')}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="INV-{YYYY}-{SEQ}"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Company Logo</label>
          <input type="file" accept="image/png, image/jpeg" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>

        {message && <p className="text-sm text-gray-600">{message}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
}