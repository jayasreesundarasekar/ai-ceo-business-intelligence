import { useEffect, useState } from 'react';
import { LayoutGrid, AlertTriangle, Radio, CheckSquare, Sparkles, ChevronRight } from 'lucide-react';
import Badge from '../components/shared/Badge';
import { api, type HealthScore, type CrisisAlert, type DashboardMetrics } from '../lib/api';

function scoreColor(score: number) {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function scoreRingColor(score: number) {
  if (score >= 75) return 'oklch(0.72 0.17 155)';
  if (score >= 50) return 'oklch(0.72 0.15 75)';
  return 'oklch(0.577 0.215 27.33)';
}

export default function CommandCenter() {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getHealthScore(), api.getCrisisAlerts(), api.getMetrics(), api.getTasks(), api.getRecentRuns()])
      .then(([h, a, m, t, r]) => {
        if (cancelled) return;
        setHealth(h);
        setAlerts(a);
        setMetrics(m);
        setTasks(t.slice(0, 6));
        setRuns(r.slice(0, 6));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const circumference = 2 * Math.PI * 42;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Command Center
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Everything in one place — company health, active alerts, revenue, open tasks, and what the AI
          has been doing.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-background-card border border-border rounded-xl p-5 lg:col-span-1">
          <p className="text-sm font-semibold font-heading text-foreground mb-4">Live Company Health</p>
          {loading || !health ? (
            <div className="h-32 rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <svg width={100} height={100} className="shrink-0 -rotate-90">
                <circle cx={50} cy={50} r={42} fill="none" stroke="oklch(0.24 0.03 260)" strokeWidth={8} />
                <circle
                  cx={50}
                  cy={50}
                  r={42}
                  fill="none"
                  stroke={scoreRingColor(health.score)}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - health.score / 100)}
                />
              </svg>
              <div>
                <p className={`text-3xl font-bold font-heading ${scoreColor(health.score)}`}>{health.score}</p>
                <p className="text-xs text-foreground-secondary">out of 100</p>
              </div>
            </div>
          )}
          {health && <p className="text-xs text-foreground-secondary mt-3 leading-relaxed">{health.narrative}</p>}
        </div>

        {/* Crisis Alerts */}
        <div className="bg-background-card border border-border rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-sm font-semibold font-heading text-foreground">Active Alerts</p>
            {alerts.length > 0 && <Badge label={String(alerts.length)} variant="critical" />}
          </div>
          {loading ? (
            <div className="h-20 rounded-lg bg-muted animate-pulse" />
          ) : alerts.length === 0 ? (
            <p className="text-sm text-foreground-secondary">No anomalies detected — all monitored metrics are within normal range.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="bg-muted/50 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <Badge label={a.severity} variant={a.severity === 'critical' ? 'critical' : 'warning'} dot />
                  </div>
                  <p className="text-xs text-foreground-secondary mb-1">{a.explanation}</p>
                  <p className="text-xs text-foreground-secondary">
                    <span className="text-foreground font-medium">Recommended: </span>
                    {a.recommended_response}
                  </p>
                  <p className="text-[11px] text-foreground-secondary mt-1 font-mono">{a.metric}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue snapshot */}
        <div className="bg-background-card border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary mb-1">Monthly Recurring Revenue</p>
          <p className="text-2xl font-semibold font-heading text-foreground">
            {metrics ? `$${metrics.mrr.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-foreground-secondary mt-1">{metrics?.customerCount ?? 0} customers</p>
        </div>

        {/* Open tasks */}
        <div className="bg-background-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold font-heading text-foreground">Open Tasks</p>
          </div>
          <div className="space-y-1.5">
            {tasks.slice(0, 4).map((t, i) => (
              <p key={i} className="text-xs text-foreground-secondary truncate">
                • {String(t.title ?? '')}
              </p>
            ))}
            {tasks.length === 0 && <p className="text-xs text-foreground-secondary">No open tasks.</p>}
          </div>
        </div>

        {/* Agent activity */}
        <div className="bg-background-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold font-heading text-foreground">Recent Agent Activity</p>
          </div>
          <div className="space-y-1.5">
            {runs.slice(0, 4).map((r, i) => (
              <p key={i} className="text-xs text-foreground-secondary truncate flex items-center gap-1">
                <ChevronRight className="w-3 h-3 shrink-0" />
                {String(r.recommended_action ?? 'Analyzing…')}
              </p>
            ))}
            {runs.length === 0 && <p className="text-xs text-foreground-secondary">No agent runs yet.</p>}
          </div>
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-xl p-4 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-foreground-secondary">
          Ask a business question from the Dashboard's "Ask AI CEO", simulate a decision in the Simulator,
          or set up a growth plan in Strategy Mode — this Command Center is the jumping-off point.
        </p>
      </div>
    </div>
  );
}
