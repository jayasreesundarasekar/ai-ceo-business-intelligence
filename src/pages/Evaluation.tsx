import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Gauge, ThumbsUp, Clock, ShieldCheck, Target } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import { api, type EvaluationMetrics } from '../lib/api';
import type { MetricCard } from '../types';

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'oklch(0.17 0.02 260)',
    border: '1px solid oklch(0.32 0.03 260)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'oklch(0.93 0.01 260)',
  },
  labelStyle: { color: 'oklch(0.75 0.03 260)', marginBottom: 4 },
};

const axisTick = { fontSize: 12, fill: 'oklch(0.75 0.03 260)' };

function formatSeconds(s: number) {
  if (s < 60) return `${s.toFixed(1)}s`;
  const mins = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${mins}m ${rest}s`;
}

function buildStatCards(m: EvaluationMetrics): MetricCard[] {
  return [
    {
      id: 'decisions-made',
      title: 'Decisions Made',
      value: m.decisionsMade,
      format: 'number',
      trend: 0,
      trendDirection: 'flat',
      sentiment: 'neutral',
      comparisonLabel: `${m.decisionsReviewed} reviewed by a human`,
      icon: 'activity',
    },
    {
      id: 'acceptance-rate',
      title: 'Decisions Accepted',
      value: m.acceptanceRate,
      format: 'percentage',
      trend: 0,
      trendDirection: 'flat',
      sentiment: m.acceptanceRate >= 60 ? 'positive' : m.acceptanceRate >= 40 ? 'neutral' : 'negative',
      comparisonLabel: `${m.decisionsAccepted} approved / ${m.decisionsRejected} rejected`,
      icon: 'trending-up',
    },
    {
      id: 'revenue-protected',
      title: 'Revenue Protected',
      value: m.revenueProtected,
      format: 'currency',
      trend: 0,
      trendDirection: 'flat',
      sentiment: 'positive',
      comparisonLabel: `${m.atRiskAccountsRetained} of ${m.atRiskAccountsSeen} at-risk accounts saved`,
      icon: 'dollar',
    },
    {
      id: 'response-time',
      title: 'Avg Response Time',
      value: m.avgResponseTimeSeconds,
      format: 'number',
      trend: 0,
      trendDirection: 'flat',
      sentiment: m.avgResponseTimeSeconds <= 30 ? 'positive' : 'neutral',
      comparisonLabel: 'event received → decision delivered',
      icon: 'clock',
    },
    {
      id: 'retention-rate',
      title: 'Customer Retention Rate',
      value: m.retentionRate,
      format: 'percentage',
      trend: 0,
      trendDirection: 'flat',
      sentiment: m.retentionRate >= 70 ? 'positive' : m.retentionRate >= 40 ? 'neutral' : 'negative',
      comparisonLabel: 'of high/critical-risk accounts approved for retention',
      icon: 'trending-up',
    },
  ];
}

export default function Evaluation() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getEvaluation()
      .then((data) => !cancelled && setMetrics(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = metrics ? buildStatCards(metrics) : null;
  // Override the "Avg Response Time" stat card's value display, which needs
  // custom m/s formatting rather than the shared currency/percent/number formats.
  const responseTimeCard = cards?.find((c) => c.id === 'response-time');

  const trendData = (metrics?.trend ?? []).map((t) => ({
    month: t.month,
    'Decisions Made': t.decisionsMade,
    Accepted: t.accepted,
  }));

  const calibrationData = (metrics?.calibration ?? []).map((c) => ({
    bucket: c.bucket,
    'AI Confidence': c.avgConfidence,
    'Actual Approval Rate': c.approvalRate,
    n: c.sampleSize,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold font-heading text-foreground flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            AI Evaluation
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            How the AI CEO is performing over time — not just what it recommends, but whether those
            recommendations are trusted, fast, and actually protect the business.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading || !cards
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-background-card border border-border animate-pulse" />
            ))
          : cards.map((metric) =>
              metric.id === 'response-time' && responseTimeCard ? (
                <div
                  key={metric.id}
                  className="card-enter bg-background-card border border-border rounded-xl p-5 hover:border-border-strong transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4.5 h-4.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary mb-1">{metric.title}</p>
                  <span className="text-2xl font-semibold font-heading text-foreground">
                    {formatSeconds(metric.value)}
                  </span>
                  <p className="text-xs text-foreground-secondary mt-1">{metric.comparisonLabel}</p>
                </div>
              ) : (
                <StatCard key={metric.id} {...metric} />
              )
            )}
      </div>

      {/* Trend + Calibration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Decisions over time */}
        <div className="bg-background-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-primary" />
              Decisions Over Time
            </h3>
          </div>
          {loading ? (
            <div className="h-64 rounded-lg bg-muted animate-pulse" />
          ) : trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center px-6">
              <p className="text-xs text-foreground-secondary">
                No decisions yet. Trigger a workflow from Live Demo to start building a track record.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={2}>
                  <CartesianGrid stroke="oklch(0.24 0.03 260)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} width={32} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'oklch(0.75 0.03 260)' }} />
                  <Bar
                    dataKey="Decisions Made"
                    fill="oklch(0.62 0.19 260 / 0.7)"
                    radius={[4, 4, 1, 1]}
                    maxBarSize={28}
                  />
                  <Bar dataKey="Accepted" fill="oklch(0.72 0.17 155 / 0.75)" radius={[4, 4, 1, 1]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Confidence calibration */}
        <div className="bg-background-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              AI Confidence Calibration
            </h3>
          </div>
          {loading ? (
            <div className="h-64 rounded-lg bg-muted animate-pulse" />
          ) : calibrationData.every((c) => c.n === 0) ? (
            <div className="h-64 flex items-center justify-center text-center px-6">
              <p className="text-xs text-foreground-secondary">
                Calibration needs reviewed decisions — approve or reject a few recommendations to populate this.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calibrationData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={2}>
                  <CartesianGrid stroke="oklch(0.24 0.03 260)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'oklch(0.75 0.03 260)' }} />
                  <Bar dataKey="AI Confidence" fill="oklch(0.72 0.15 75 / 0.7)" radius={[4, 4, 1, 1]} maxBarSize={28} />
                  <Bar
                    dataKey="Actual Approval Rate"
                    fill="oklch(0.62 0.19 260 / 0.7)"
                    radius={[4, 4, 1, 1]}
                    maxBarSize={28}
                  >
                    {calibrationData.map((entry, idx) => (
                      <Cell key={idx} fillOpacity={entry.n === 0 ? 0.15 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-foreground-secondary mt-3">
            Bars that track closely together mean the AI's stated confidence matches how often humans
            actually agree with it — the mark of a well-calibrated system rather than one that's just
            confidently wrong.
          </p>
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-background-card border border-border rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="text-xs text-foreground-secondary space-y-1">
          <p className="text-foreground font-medium font-heading text-sm">How these numbers are calculated</p>
          <p>
            Every metric here is derived from real workflow runs and human approve/reject feedback —
            nothing is hardcoded. <span className="text-foreground">Revenue protected</span> sums the
            annual value of high/critical-risk accounts whose recommended action was approved.{' '}
            <span className="text-foreground">Retention rate</span> is the share of at-risk accounts
            saved out of all at-risk accounts the agent encountered.{' '}
            <span className="text-foreground">Response time</span> is measured end-to-end, from the
            triggering event to a completed decision. This is how the system demonstrates it isn't just
            making recommendations — it's measuring its own effectiveness.
          </p>
        </div>
      </div>
    </div>
  );
}
