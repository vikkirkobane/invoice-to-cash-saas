'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@invoice/ui';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  archivedAt?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const res = await fetch(`/api/v1/customers?search=${search}`);
    if (res.ok) {
      const json = await res.json();
      setCustomers(json.data);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link href="/dashboard/customers/new">
          <Button>Add Customer</Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 whitespace-nowrap">{c.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{c.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{c.phone || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <Link href={`/dashboard/customers/${c.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                  <Link href={`/dashboard/customers/${c.id}/edit`} className="text-gray-600 hover:text-gray-900">Edit</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}