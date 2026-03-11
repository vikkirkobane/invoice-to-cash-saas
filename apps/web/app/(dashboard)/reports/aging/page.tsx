'use client';

import { useEffect, useState } from 'react';
import { Button } from '@invoice/ui';

interface AgingRow {
  customerName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  amountDue: number;
  bucket: string;
}

export default function AgingReportPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, []);

  async function fetchReport() {
    const res = await fetch('/api/v1/reports/aging');
    if (res.ok) { const json = await res.json(); setRows(json.data); }
    setLoading(false);
  }

  function exportCSV() {
    window.location.href = '/api/v1/reports/aging/export';
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Aging Report</h1>
        <Button onClick={exportCSV}>Export CSV</Button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap">{r.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.invoiceNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(r.issueDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(r.dueDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.daysOverdue}</td>
                <td className="px-6 py-4 whitespace-nowrap">${r.amountDue.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No overdue invoices.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}