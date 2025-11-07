export default function UserGuidePage() {
  return (
    <div className="space-y-10 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 sm:pr-2">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Getting Started</h2>
        <p className="text-sm text-slate-300">
          This dashboard helps you configure organisations, projects, and load-test tasks, run k6 scenarios,
          and review reports. Follow the steps below if you&apos;re new to the platform.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Key Navigation</h3>
        <ol className="space-y-3 text-sm text-slate-300">
          <li><strong>Overview</strong> – quick glance at organisations, projects, and recent activity.</li>
          <li><strong>Organisations</strong> – admins can create new organisations; owners/members view their own.</li>
          <li><strong>Projects</strong> – create and manage load-test projects within an organisation.</li>
          <li><strong>Tasks</strong> – configure scenarios with HTTP methods, headers, payload, schedule, and run history.</li>
          <li><strong>Reports</strong> – review execution metrics, analytics, and export PDF summaries.</li>
          <li><strong>User Guide</strong> – this page, always available for reference.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Creating a Project</h3>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-2 text-sm text-slate-300">
          <p>1. Go to <strong>Projects</strong> and select an organisation from the dropdown.</p>
          <p>2. Enter a project name and optional description.</p>
          <p>3. Submit to create – the project appears in the list with a “Manage tasks” link.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Managing Tasks</h3>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-2 text-sm text-slate-300">
          <p>1. Navigate to <strong>Tasks</strong>, choose an organisation and project.</p>
          <p>2. Provide task label, target URL, and mode (SMOKE, STRESS, etc.).</p>
          <p>3. Expand <strong>Show advanced</strong> for HTTP method, headers, payload, and schedule options.</p>
          <p>4. Click “Create task”; tasks list shows configuration and allows running scenarios.</p>
          <p>5. Press “Run task” to trigger k6 execution. Metrics and raw data appear after completion.</p>
        </div>
      </section>


      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Account Security</h3>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-2 text-sm text-slate-300">
          <p>Open <strong>Settings</strong> to change your password. Enter your current password, choose a new one (minimum 8 characters), and confirm it.</p>
          <p>You&apos;ll see a confirmation message once the password is updated.</p>
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Load-Test Modes</h3>
        <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">SMOKE</h4>
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-xs text-slate-400">
                2 VUs · 30s
              </span>
            </div>
            <p>Use after every deploy to confirm the endpoint responds cleanly under minimal traffic.</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              <li><strong>Purpose:</strong> catch broken routes or missing dependencies fast.</li>
              <li><strong>Trigger:</strong> CI/CD smoke stage or post-release validation.</li>
              <li><strong>Exit signal:</strong> ≥99% success rate, p95 {`<`} 800 ms.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">STRESS</h4>
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-xs text-slate-400">
                5 VUs · 1m
              </span>
            </div>
            <p>Gradually increases sustained pressure to uncover bottlenecks or resource ceilings.</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              <li><strong>Purpose:</strong> map failure thresholds and alerting behaviour.</li>
              <li><strong>Trigger:</strong> pre-scale testing before a high-traffic campaign.</li>
              <li><strong>Exit signal:</strong> perf degradation {`<`}10% once steady state is reached.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">SOAK</h4>
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-xs text-slate-400">
                3 VUs · 2m
              </span>
            </div>
            <p>Runs longer to expose memory leaks, queue build-up, or throttling effects that appear over time.</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              <li><strong>Purpose:</strong> validate stability of autoscaling and background workers.</li>
              <li><strong>Trigger:</strong> overnight reliability checks or before long-lived events.</li>
              <li><strong>Exit signal:</strong> trend charts stay flat; resource usage returns to baseline.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">SPIKE</h4>
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-xs text-slate-400">
                10 VUs · 20s
              </span>
            </div>
            <p>Injects sudden bursts to check how quickly the platform recovers from sharp demand changes.</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              <li><strong>Purpose:</strong> observe autoscaling triggers and rate-limit handling.</li>
              <li><strong>Trigger:</strong> Black Friday-style launches, marketing spikes.</li>
              <li><strong>Exit signal:</strong> response times recover within 60s and success rate stays {`>`}97%.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4 space-y-2 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">CUSTOM</h4>
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-xs text-slate-400">
                20 VUs · 1m (default)
              </span>
            </div>
            <p>Starts from SMOKE defaults but lets you override k6 options via environment variables.</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              <li><strong>Purpose:</strong> model complex ramps, regional targets, or business-specific SLAs.</li>
              <li><strong>How:</strong> edit the task payload or headers to send auth tokens and custom bodies.</li>
              <li><strong>Tip:</strong> document chosen VU/duration in the task description for team visibility.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Reading Reports & Exporting PDFs</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Recent runs show status, latency metrics, and request summary for quick analysis.</li>
          <li>The analytics banner highlights success rate, dominant mode, and predictive insights.</li>
          <li>Use “Download PDF Report” to export an aggregated document for stakeholders.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">Tips for Success</h3>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-2 text-sm text-slate-300">
          <p><strong>Before running:</strong> confirm the target environment is reachable and stable.</p>
          <p><strong>During runs:</strong> watch API logs for k6 output and handle any failures.</p>
          <p><strong>After runs:</strong> review metrics, share the generated PDF, and adjust scenarios if needed.</p>
          <p><strong>Scaling:</strong> For continuous testing, wire the queue into a dedicated worker or scheduler and tune k6 settings.</p>
        </div>
      </section>
    </div>
  );
}
