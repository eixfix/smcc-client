'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

const highlights = [
  {
    icon: CheckCircleIcon,
    title: 'Live telemetry',
    description: 'Watch throughput, latency, and error slices update in real-time.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise security',
    description: 'All credentials stay on your infrastructure thanks to the proxy session layer.'
  },
  {
    icon: SparklesIcon,
    title: 'Actionable briefs',
    description: 'Export orchestrated reports and next steps after every run without extra tooling.'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? 'Unable to sign in.');
      setIsSubmitting(false);
      return;
    }

    const redirectTo = searchParams.get('from') ?? '/';
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <section className="grid w-full gap-10 rounded-[32px] border border-slate-800/60 bg-slate-950/80 p-8 shadow-[0_45px_120px_-60px_rgba(56,189,248,0.45)] backdrop-blur-2xl lg:grid-cols-[1.15fr_1fr] lg:p-12">
      <div className="flex flex-col justify-center gap-10">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-accent-soft">
            Server Monitoring Platform
          </span>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl">
              Observe every server from a unified command center.
            </h1>
            <p className="text-base text-slate-400">
              Sign in to orchestrate scans, coordinate teams, and deliver clear operational
              narratives without swapping between tools.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {highlights.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-[0_25px_60px_-55px_rgba(56,189,248,0.55)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-strong/15 text-accent-soft">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-100">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-slate-800/70 bg-slate-900/80 p-1 shadow-[0_55px_120px_-70px_rgba(14,165,233,0.6)]">
        <CardHeader className="border-none px-6 pt-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Use the seeded administrator credentials to explore the dashboard. Your password never
              leaves your infra thanks to the API session proxy.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wide text-slate-400">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="administrator@mail.com"
                autoComplete="email"
                className="h-11 rounded-lg border-slate-700/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
              >
                Password
                <span className="font-normal capitalize text-slate-500">default: open1234</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 rounded-lg border-slate-700/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                required
              />
            </div>
            {error ? (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                By continuing you agree to our operational safeguards and launch policies.
              </p>
            )}
            <Button type="submit" className="h-11 w-full rounded-lg text-base" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In…' : 'Enter Monitoring Center'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
