'use client';

import { useState, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { cn } from '@/src/lib/utils';

type FormState = {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const DEFAULT_STATE: FormState = {
  name: '',
  slug: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: ''
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function CreateOrganizationForm({ className }: { className?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const isSubmitDisabled = useMemo(() => {
    return (
      !form.name ||
      !form.slug ||
      !form.ownerName ||
      !form.ownerEmail ||
      form.ownerPassword.length < 8 ||
      isSubmitting
    );
  }, [form, isSubmitting]);

  const handleChange = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      if (key === 'name' && !slugEdited) {
        next.slug = slugify(value);
      }
      if (key === 'slug') {
        setSlugEdited(true);
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          owner: {
            name: form.ownerName.trim(),
            email: form.ownerEmail.trim(),
            password: form.ownerPassword
          }
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Unable to create organization.');
        setIsSubmitting(false);
        return;
      }

      setSuccess('Organization created and owner invited.');
      setForm(DEFAULT_STATE);
      setSlugEdited(false);
      router.refresh();
    } catch (submitError) {
      console.warn('Failed to create organization', submitError);
      setError('Unexpected error creating organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn('border-slate-800/70 bg-slate-950/60', className)}>
      <CardHeader>
        <CardTitle>Create Organization</CardTitle>
        <CardDescription>
          Spin up a new portfolio and assign its owner. Owners gain immediate access with a seeded
          account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-1">
            <Label htmlFor="organization-name" className="text-xs uppercase tracking-wide text-slate-400">
              Organization name
            </Label>
            <Input
              id="organization-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="RedAnt Platform"
              className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
              required
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="organization-slug" className="text-xs uppercase tracking-wide text-slate-400">
              Organization slug
            </Label>
            <Input
              id="organization-slug"
              value={form.slug}
              onChange={handleChange('slug')}
              placeholder="redant-platform"
              className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
              required
            />
            <p className="mt-2 text-xs text-slate-500">Used in URLs and automation workflows.</p>
          </div>

          <div className="md:col-span-2">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-slate-200">Owner account</p>
              <p className="mt-1 text-xs text-slate-500">
                We will create a new owner user and add them to the organization automatically.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="owner-name" className="text-xs uppercase tracking-wide text-slate-400">
                    Owner name
                  </Label>
                  <Input
                    id="owner-name"
                    value={form.ownerName}
                    onChange={handleChange('ownerName')}
                    placeholder="Jamie Lead"
                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner-email" className="text-xs uppercase tracking-wide text-slate-400">
                    Owner email
                  </Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={form.ownerEmail}
                    onChange={handleChange('ownerEmail')}
                    placeholder="jamie.lead@example.com"
                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label
                    htmlFor="owner-password"
                    className="text-xs uppercase tracking-wide text-slate-400"
                  >
                    Temporary password
                  </Label>
                  <Input
                    id="owner-password"
                    type="password"
                    value={form.ownerPassword}
                    onChange={handleChange('ownerPassword')}
                    placeholder="At least 8 characters"
                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                    required
                    minLength={8}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Share this password with the owner and encourage them to change it on first login.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="md:col-span-2">
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            </div>
          ) : null}

          {success ? (
            <div className="md:col-span-2">
              <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                {success}
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" className="h-11 rounded-lg px-6" disabled={isSubmitDisabled}>
              {isSubmitting ? 'Creating…' : 'Create organization'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
