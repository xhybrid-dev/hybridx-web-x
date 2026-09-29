'use client';

import { useState, useTransition } from 'react';
import { deleteLead, setLeadStatus } from '@/app/admin/plan-finder/actions';

export default function LeadActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError('');
      try {
        await fn();
      } catch {
        setError('That did not save. Please try again.');
      }
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status
      </label>
      <select
        id={`status-${id}`}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => run(() => setLeadStatus(id, e.target.value))}
      >
        <option value="new">New</option>
        <option value="replied">Replied</option>
        <option value="closed">Closed</option>
      </select>
      <button
        type="button"
        className="h-9 rounded-md border px-3 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (window.confirm('Delete this message for good? This cannot be undone.')) run(() => deleteLead(id));
        }}
      >
        Delete
      </button>
      {error && <span role="status" className="text-sm">{error}</span>}
    </div>
  );
}
