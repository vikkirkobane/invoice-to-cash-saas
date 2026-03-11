'use client';

import { useForm } from 'react-hook-form';

interface Props {
  customers: any[];
  register: ReturnType<typeof useForm>['register'];
}

export function CustomerSelect({ customers, register }: Props) {
  return (
    <select {...register('customerId')} className="border border-gray-300 rounded p-2 w-full">
      <option value="">Select a customer</option>
      {customers.map(c => (
        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
      ))}
    </select>
  );
}