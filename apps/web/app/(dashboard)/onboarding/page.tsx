'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tenantOnboardingSchema } from '@invoice/utils/schemas/tenant';
import type { z } from 'zod';
import { Button } from '@invoice/ui';

type OnboardingForm = z.infer<typeof tenantOnboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(tenantOnboardingSchema),
    defaultValues: {
      currency: 'USD',
      paymentTerms: 30,
    },
  });

  async function onSubmit(data: OnboardingForm) {
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('companyName', data.companyName);
      body.append('currency', data.currency);
      body.append('paymentTerms', String(data.paymentTerms));
      if (data.logoFile) body.append('logoFile', data.logoFile);

      const res = await fetch('/api/v1/tenants/onboarding', {
        method: 'POST',
        body,
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to save');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Set up your company</h2>
          <p className="mt-2 text-sm text-gray-600">Step {step} of 3</p>
        </div>

        {error && <p className="text-red-600 text-center">{error}</p>}

        <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  {...form.register('companyName')}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  placeholder="Acme Corp"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)} disabled={!form.formState.isValid}>
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
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
                  min={1}
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!form.formState.isValid}>
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Logo (optional)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) form.setValue('logoFile', file);
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Finish'}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}