'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@invoice/ui';

const defaultTemplates = [
  { slot: 'early', subject: 'Invoice #{{invoice_number}} due in 3 days', offsetDays: -3, enabled: true },
  { slot: 'due_today', subject: 'Invoice #{{invoice_number}} is due today', offsetDays: 0, enabled: true },
  { slot: 'late_1', subject: 'Invoice #{{invoice_number}} is overdue', offsetDays: 3, enabled: true },
  { slot: 'late_2', subject: 'Action Required: Invoice #{{invoice_number}}', offsetDays: 7, enabled: true },
  { slot: 'final', subject: 'Final Notice: Invoice #{{invoice_number}}', offsetDays: 14, enabled: true },
];

export default function RemindersPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const res = await fetch('/api/v1/reminders/templates');
    if (res.ok) {
      const json = await res.json();
      setTemplates(json.data);
    }
  }

  async function save(slot: string, data: any) {
    setLoading(true);
    await fetch(`/api/v1/reminders/templates/${slot}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    fetchTemplates();
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reminder Templates</h1>
      <div className="space-y-6">
        {defaultTemplates.map(tpl => (
          <div key={tpl.slot} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium capitalize">{tpl.slot.replace('_', ' ')}</h2>
              <label className="flex items-center">
                <input type="checkbox" checked={tpl.enabled} onChange={e => save(tpl.slot, { enabled: e.target.checked })} className="mr-2" />
                Enabled
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Subject</label>
                <input defaultValue={templates.find(t => t.slot === tpl.slot)?.subject || tpl.subject} onBlur={e => save(tpl.slot, { subject: e.target.value })} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Body</label>
                <textarea defaultValue={templates.find(t => t.slot === tpl.slot)?.body || ''} onBlur={e => save(tpl.slot, { body: e.target.value })} className="w-full border p-2 rounded h-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}