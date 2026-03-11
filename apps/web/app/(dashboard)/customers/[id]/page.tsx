'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@invoice/ui';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.id) fetchCustomer();
  }, [params.id]);

  async function fetchCustomer() {
    setLoading(true);
    const res = await fetch(`/api/v1/customers/${params.id}`);
    if (res.ok) {
      const json = await res.json();
      setCustomer(json.data);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/customers')}>Back</Button>
          <Button onClick={() => router.push(`/dashboard/customers/${params.id}/edit`)}>Edit</Button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : customer ? (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="text-lg">{customer.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="text-lg">{customer.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="text-lg">{customer.phone || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="text-lg whitespace-pre-wrap">{customer.notes || '-'}</p>
          </div>
        </div>
      ) : (
        <p>Customer not found.</p>
      )}
    </div>
  );
}