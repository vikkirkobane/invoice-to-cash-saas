'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@invoice/ui';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/summary')
      .then(res => res.json())
      .then(data => { setSummary(data); setLoading(false); });
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Outstanding</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">${parseFloat(summary.outstanding || '0').toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Overdue</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">${parseFloat(summary.overdue || '0').toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Collected This Month</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">${parseFloat(summary.collectedThisMonth || '0').toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <div className="mt-4 space-x-4">
          <Link href="/dashboard/invoices/new"><Button>Create Invoice</Button></Link>
          <Link href="/dashboard/customers/new"><Button variant="outline">Add Customer</Button></Link>
          <Link href="/dashboard/reports/aging"><Button variant="outline">Aging Report</Button></Link>
        </div>
      </div>
    </div>
  );
}