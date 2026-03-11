'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@invoice/ui';

export default function PayPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'stripe' | 'paypal'>('stripe');

  useEffect(() => {
    fetchInvoice();
  }, [params.token]);

  async function fetchInvoice() {
    const res = await fetch(`/api/v1/pay/${params.token}`);
    if (res.ok) {
      const json = await res.json();
      setInvoice(json.invoice);
    }
  }

  async function pay() {
    setLoading(true);
    const res = await fetch(`/api/v1/pay/${params.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    setLoading(false);
  }

  if (!invoice) return <p>Loading...</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Pay Invoice</h1>
        <p className="text-gray-600 mb-2">Invoice #{params.token}</p>
        <p className="text-3xl font-bold mb-6">${(invoice.total / 100).toFixed(2)} {invoice.currency}</p>

        <div className="space-y-4 mb-6">
          <label className="flex items-center space-x-3">
            <input type="radio" value="stripe" checked={provider === 'stripe'} onChange={() => setProvider('stripe')} />
            <span>Pay with Card (Stripe)</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="radio" value="paypal" checked={provider === 'paypal'} onChange={() => setProvider('paypal')} />
            <span>Pay with PayPal</span>
          </label>
        </div>

        <Button onClick={pay} disabled={loading} className="w-full">
          {loading ? 'Redirecting...' : `Pay Now`}
        </Button>
      </div>
    </div>
  );
}