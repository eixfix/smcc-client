export const dynamic = 'force-static';

export default function HealthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 px-8 py-10 text-center shadow-[0_40px_120px_-80px_rgba(56,189,248,0.5)]">
        <p className="text-xs uppercase tracking-[0.35em] text-accent-soft">Server Monitoring</p>
        <h1 className="mt-4 text-2xl font-semibold">Client Health Check</h1>
        <p className="mt-2 text-sm text-slate-400">status: ok</p>
        <p className="mt-1 text-xs text-slate-500">{new Date().toISOString()}</p>
      </div>
    </div>
  );
}
