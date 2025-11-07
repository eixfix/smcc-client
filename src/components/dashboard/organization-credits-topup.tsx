'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

export function OrganizationCreditsTopUp({
  organizationId,
  organizationName
}: {
  organizationId: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [amount, setAmount] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a positive credit amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parsed })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to add credits.');
        return;
      }

      setAmount('50');
      setEditing(false);
      router.refresh();
    } catch (requestError) {
      console.warn('Failed to top up credits', requestError);
      setError('Unexpected error adding credits.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <Button
        variant="secondary"
        className="text-xs"
        onClick={() => {
          setEditing(true);
          setError(null);
        }}
      >
        Add credits
      </Button>
    );
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`credit-amount-${organizationId}`} className="text-[11px] uppercase tracking-wide text-slate-500">
          Credits to add
        </Label>
        <Input
          id={`credit-amount-${organizationId}`}
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-9 w-28 rounded-lg border-slate-800/70 bg-slate-950/70 text-sm text-slate-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" className="h-9 px-4" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Confirm'}
        </Button>
      <Button
        type="button"
        variant="ghost"
        className="text-xs"
        onClick={() => {
          setEditing(false);
          setAmount('50');
          setError(null);
        }}
      >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </form>
  );
}
