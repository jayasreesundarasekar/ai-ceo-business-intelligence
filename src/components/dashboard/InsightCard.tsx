import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Zap, ChevronRight, ChevronDown, HelpCircle, Loader2 } from 'lucide-react';
import Badge from '../shared/Badge';
import { api, type WorkflowExplanation } from '../../lib/api';
import type { Insight } from '../../types';

const categoryIcons = {
  revenue: TrendingUp,
  churn: TrendingDown,
  operations: Zap,
  bottleneck: AlertTriangle,
};

const severityLabels: Record<Insight['severity'], { label: string; variant: 'critical' | 'warning' | 'info' }> = {
  critical: { label: 'Critical', variant: 'critical' },
  warning: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'info' },
};

interface InsightCardProps {
  insight: Insight;
  compact?: boolean;
}

/** AI Confidence Meter — a compact 0-100% bar, colored by how trustworthy the number is. */
function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-destructive';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-foreground-secondary">AI Confidence</p>
        <p className="text-xs font-medium text-foreground">{pct}%</p>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Explainable AI panel: data sources consulted, confidence, missing info, alternatives. */
function ExplainPanel({ id }: { id: string }) {
  const [data, setData] = useState<WorkflowExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .explainWorkflowRun(id)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-foreground-secondary py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading explanation…
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-xs text-destructive py-2">Couldn't load explanation ({error}).</p>;
  }

  return (
    <div className="space-y-3 pt-1">
      <ConfidenceMeter confidence={data.confidence} />

      <div>
        <p className="text-xs font-medium text-foreground-secondary mb-1.5">Data sources consulted</p>
        <ul className="space-y-1">
          {data.data_sources_consulted.map((s, i) => (
            <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span> {s}
            </li>
          ))}
        </ul>
      </div>

      {data.missing_information.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-secondary mb-1.5">What would raise confidence</p>
          <ul className="space-y-1">
            {data.missing_information.map((m, i) => (
              <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                <span className="text-warning mt-0.5">•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.alternative_actions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-secondary mb-1.5">Alternative actions considered</p>
          <ul className="space-y-1">
            {data.alternative_actions.map((a, i) => (
              <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                <span className="text-foreground-secondary mt-0.5">•</span> {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function InsightCard({ insight, compact = false }: InsightCardProps) {
  const Icon = categoryIcons[insight.category];
  const sev = severityLabels[insight.severity];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-background-card border border-border rounded-xl transition-all duration-200 hover:border-border-strong ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          insight.severity === 'critical' ? 'bg-destructive/10' :
          insight.severity === 'warning' ? 'bg-warning/10' :
          'bg-info/10'
        }`}>
          <Icon className={`w-4 h-4 ${
            insight.severity === 'critical' ? 'text-destructive' :
            insight.severity === 'warning' ? 'text-warning' :
            'text-info'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge label={sev.label} variant={sev.variant} dot />
            {!insight.read && (
              <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            )}
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1 font-heading">
            {insight.title}
          </h4>
          {!compact && (
            <>
              <p className="text-sm text-foreground-secondary mb-3 leading-relaxed">
                {insight.description}
              </p>
              <div className="bg-muted rounded-lg p-3 border border-border">
                <p className="text-xs text-foreground-secondary mb-1 font-medium">
                  Suggested Action
                </p>
                <p className="text-sm text-foreground">{insight.action}</p>
              </div>

              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary mt-3 cursor-pointer hover:opacity-80"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Why? {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expanded && (
                <div className="mt-2 bg-muted/40 border border-border rounded-lg p-3">
                  <ExplainPanel id={insight.id} />
                </div>
              )}
            </>
          )}
          {compact && (
            <div className="flex items-center gap-2 mt-2">
              {insight.metric && (
                <span className="text-xs font-mono font-medium text-foreground-secondary">
                  {insight.metric}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-foreground-secondary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
