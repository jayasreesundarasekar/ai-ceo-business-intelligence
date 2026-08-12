import { useState } from 'react';
import { FlaskConical, TrendingUp, TrendingDown, Minus, Send } from 'lucide-react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, type SimulationResult } from '../lib/api';

const examples = [
  'What happens if we give a 20% discount to all premium customers?',
  'What if we raise prices 10% for enterprise tier?',
  'What if we extend free trials from 14 to 30 days?',
];

const directionIcon = {
  increase: TrendingUp,
  decrease: TrendingDown,
  neutral: Minus,
};

function directionColor(direction: 'increase' | 'decrease' | 'neutral', goodIsIncrease: boolean) {
  if (direction === 'neutral') return 'text-foreground-secondary';
  const isGood = goodIsIncrease ? direction === 'increase' : direction === 'decrease';
  return isGood ? 'text-success' : 'text-destructive';
}

function ImpactRow({
  label,
  direction,
  value,
  reasoning,
  goodIsIncrease = true,
}: {
  label: string;
  direction: 'increase' | 'decrease' | 'neutral';
  value: string;
  reasoning: string;
  goodIsIncrease?: boolean;
}) {
  const Icon = directionIcon[direction];
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-foreground-secondary">{label}</p>
        <Icon className={`w-4 h-4 ${directionColor(direction, goodIsIncrease)}`} />
      </div>
      <p className={`text-lg font-semibold font-heading ${directionColor(direction, goodIsIncrease)}`}>{value}</p>
      <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">{reasoning}</p>
    </div>
  );
}

export default function Simulator() {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (text?: string) => {
    const s = (text ?? scenario).trim();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.runSimulation(s));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          Business Simulator
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          A "what-if" planning tool. Describe an action before you take it — the AI estimates revenue,
          churn, profit, and satisfaction impact from your real current metrics.
        </p>
      </div>

      <div className="bg-background-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="What happens if we give a 20% discount to all premium customers?"
            className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary/50"
          />
          <Button variant="primary" onClick={() => run()} disabled={loading || !scenario.trim()}>
            <Send className="w-4 h-4" />
            Simulate
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setScenario(ex);
                run(ex);
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground-secondary border border-border hover:border-border-strong hover:text-foreground transition-colors cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="h-8 rounded-lg bg-background-card border border-border animate-pulse w-2/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-background-card border border-border animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="bg-background-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold font-heading text-foreground mb-1">{result.scenario}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge label={`${Math.round(result.confidence * 100)}% confidence`} variant={result.confidence >= 0.6 ? 'success' : 'warning'} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImpactRow
              label="Revenue Impact"
              direction={result.revenue_impact.direction}
              value={`${result.revenue_impact.direction === 'decrease' ? '-' : '+'}$${Math.abs(result.revenue_impact.estimate_dollars).toLocaleString()} (${result.revenue_impact.estimate_percent}%)`}
              reasoning={result.revenue_impact.reasoning}
            />
            <ImpactRow
              label="Churn Impact"
              direction={result.churn_impact.direction}
              value={`${result.churn_impact.direction === 'decrease' ? '-' : '+'}${Math.abs(result.churn_impact.estimate_percent_points)} pts`}
              reasoning={result.churn_impact.reasoning}
              goodIsIncrease={false}
            />
            <ImpactRow
              label="Profit Impact"
              direction={result.profit_impact.direction}
              value={`${result.profit_impact.direction === 'decrease' ? '-' : '+'}$${Math.abs(result.profit_impact.estimate_dollars).toLocaleString()}`}
              reasoning={result.profit_impact.reasoning}
            />
            <ImpactRow
              label="Customer Satisfaction"
              direction={result.customer_satisfaction_impact.direction}
              value={result.customer_satisfaction_impact.direction === 'increase' ? 'Improves' : result.customer_satisfaction_impact.direction === 'decrease' ? 'Declines' : 'No change'}
              reasoning={result.customer_satisfaction_impact.reasoning}
            />
          </div>

          {result.risks.length > 0 && (
            <div className="bg-background-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-foreground-secondary mb-2">Risks to consider</p>
              <ul className="space-y-1.5">
                {result.risks.map((r, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="gradient-border rounded-xl">
            <div className="bg-background-card rounded-xl p-4">
              <p className="text-xs font-medium text-foreground-secondary mb-1">AI Recommendation</p>
              <p className="text-sm text-foreground">{result.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
