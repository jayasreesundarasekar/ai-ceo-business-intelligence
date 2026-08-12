import { useState } from 'react';
import { Swords, TrendingUp, Wallet, LifeBuoy, Gavel, Send } from 'lucide-react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, type DebateResult } from '../lib/api';

const examples = [
  'Should we offer a 20% retention discount to at-risk enterprise accounts?',
  'Should we raise prices for the Pro tier next quarter?',
  'Should we hire two more support reps or invest in automation?',
];

const agents = [
  { key: 'sales' as const, label: 'Sales Agent', icon: TrendingUp, color: 'text-info' },
  { key: 'finance' as const, label: 'Finance Agent', icon: Wallet, color: 'text-warning' },
  { key: 'support' as const, label: 'Support Agent', icon: LifeBuoy, color: 'text-success' },
];

export default function Debate() {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (text?: string) => {
    const t = (text ?? topic).trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.runDebate(t));
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
          <Swords className="w-5 h-5 text-primary" />
          Multi-Agent Debate
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Sales, Finance, and Support genuinely disagree by design — each argues from its own incentives,
          then a CEO agent weighs the arguments and decides.
        </p>
      </div>

      <div className="bg-background-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Should we offer a 20% retention discount to at-risk enterprise accounts?"
            className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary/50"
          />
          <Button variant="primary" onClick={() => run()} disabled={loading || !topic.trim()}>
            <Send className="w-4 h-4" />
            Debate
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setTopic(ex);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-background-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="bg-background-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-sm font-semibold font-heading text-foreground">{label}</p>
                </div>
                <p className={`text-sm font-medium mb-2 ${color}`}>{result[key].position}</p>
                <p className="text-xs text-foreground-secondary leading-relaxed">{result[key].argument}</p>
              </div>
            ))}
          </div>

          <div className="gradient-border rounded-xl">
            <div className="bg-background-card rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Gavel className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground font-heading">CEO Agent's Final Call</p>
                  <Badge label={`${Math.round(result.ceo_confidence * 100)}% confidence`} variant={result.ceo_confidence >= 0.6 ? 'success' : 'warning'} />
                </div>
                <p className="text-sm text-foreground font-medium">{result.ceo_decision}</p>
                <p className="text-sm text-foreground-secondary leading-relaxed">{result.ceo_reasoning}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
