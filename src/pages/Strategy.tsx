import { useState } from 'react';
import { Compass, Send, Target, ShieldAlert, LineChart } from 'lucide-react';
import Button from '../components/shared/Button';
import { api, type StrategyPlan } from '../lib/api';

const examples = [
  'How can we grow revenue by 20% next quarter?',
  'How do we reduce churn among Pro-tier accounts?',
  'What should our expansion strategy be for enterprise accounts?',
];

export default function Strategy() {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<StrategyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (text?: string) => {
    const g = (text ?? goal).trim();
    if (!g) return;
    setLoading(true);
    setError(null);
    try {
      setPlan(await api.generateStrategy(g));
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
          <Compass className="w-5 h-5 text-primary" />
          Strategy Mode
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Ask a forward-looking growth question instead of today's issues — get a grounded plan with
          initiatives, risks, and success metrics.
        </p>
      </div>

      <div className="bg-background-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="How can we grow revenue by 20% next quarter?"
            className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary/50"
          />
          <Button variant="primary" onClick={() => run()} disabled={loading || !goal.trim()}>
            <Send className="w-4 h-4" />
            Plan
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setGoal(ex);
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
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-background-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {plan && !loading && (
        <div className="space-y-4">
          <div className="gradient-border rounded-xl">
            <div className="bg-background-card rounded-xl p-4">
              <p className="text-sm font-semibold font-heading text-foreground mb-1">{plan.title}</p>
              <p className="text-sm text-foreground-secondary">{plan.summary}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-foreground-secondary">
                <span><span className="text-foreground font-medium">Expected ROI:</span> {plan.expected_roi}</span>
                <span><span className="text-foreground font-medium">Timeline:</span> {plan.timeline}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold font-heading text-foreground">Initiatives</p>
            </div>
            <div className="space-y-3">
              {plan.initiatives.map((init, i) => (
                <div key={i} className="bg-background-card border border-border rounded-xl p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">{init.title}</p>
                  <p className="text-sm text-foreground-secondary mb-2 leading-relaxed">{init.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-foreground-secondary">
                    <span><span className="text-foreground font-medium">Impact:</span> {init.expected_impact}</span>
                    <span><span className="text-foreground font-medium">Timeline:</span> {init.timeline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-background-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-warning" />
                <p className="text-sm font-semibold font-heading text-foreground">Risks</p>
              </div>
              <ul className="space-y-1.5">
                {plan.risks.map((r, i) => (
                  <li key={i} className="text-sm text-foreground-secondary flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <LineChart className="w-4 h-4 text-success" />
                <p className="text-sm font-semibold font-heading text-foreground">Success Metrics</p>
              </div>
              <ul className="space-y-1.5">
                {plan.success_metrics.map((m, i) => (
                  <li key={i} className="text-sm text-foreground-secondary flex items-start gap-2">
                    <span className="text-success mt-0.5">•</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
