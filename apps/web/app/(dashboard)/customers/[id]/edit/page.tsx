'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '@invoice/utils/schemas/customer';
import type { z } from 'zod';
import { Button } from '@invoice/ui';

type CustomerForm = z.infer<typeof customerSchema>;

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (params.id) fetchCustomer();
  }, [params.id]);

  async function fetchCustomer() {
    setLoading(true);
    const res = await fetch(`/api/v1/customers/${params.id}`);
    if (res.ok) {
      const json = await res.json();
      form.reset(json.data);
    } else {
      setFetchError('Customer not found');
    }
    setLoading(false);
  }

  async function onSubmit(data: CustomerForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to update');
      } else {
        router.push(`/dashboard/customers/${params.id}`);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (fetchError) return <p>{fetchError}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Customer</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" {...form.register('name')} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" {...form.register('email')} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input type="text" {...form.register('phone')} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea {...form.register('notes')} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div className="flex space-x-4">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}