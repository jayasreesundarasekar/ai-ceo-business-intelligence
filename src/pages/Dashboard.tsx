import { useEffect, useState } from 'react';
import { Sparkles, Zap, Bell, ChevronRight, Send, X, TrendingUp, AlertTriangle } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import ChurnChart from '../components/dashboard/ChurnChart';
import InsightCard from '../components/dashboard/InsightCard';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { Link } from 'react-router-dom';
import { api, type DashboardMetrics, type Briefing, type Forecast, type KnowledgeAnswer, type CrisisAlert } from '../lib/api';
import type { RevenueDataPoint, ChurnDataPoint, Insight, MetricCard } from '../types';

function buildMetricCards(m: DashboardMetrics): MetricCard[] {
  return [
    { id: 'mrr', title: 'Monthly Recurring Revenue', value: m.mrr, format: 'currency', trend: 0, trendDirection: 'flat', sentiment: 'positive', comparisonLabel: 'from live data', icon: 'dollar' },
    { id: 'churn', title: 'High-Risk Rate', value: m.churnRate, format: 'percentage', trend: 0, trendDirection: 'flat', sentiment: m.churnRate > 20 ? 'negative' : 'neutral', comparisonLabel: 'of workflow runs', icon: 'trending-down' },
    { id: 'customers', title: 'Customers', value: m.customerCount, format: 'number', trend: 0, trendDirection: 'flat', sentiment: 'neutral', comparisonLabel: 'total accounts', icon: 'users' },
    { id: 'runs', title: 'Agent Runs', value: m.totalWorkflowRuns, format: 'number', trend: 0, trendDirection: 'flat', sentiment: 'neutral', comparisonLabel: `${m.highRiskAccounts} high risk`, icon: 'activity' },
  ];
}

function AskCeoBox({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<KnowledgeAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    try {
      setAnswer(await api.askKnowledge(question));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="bg-background-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground font-heading flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Ask AI CEO
        </p>
        <button onClick={onClose} className="text-foreground-secondary hover:text-foreground cursor-pointer" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Which customer is most likely to leave?"
          className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary/50"
        />
        <Button variant="primary" size="sm" onClick={handleAsk} disabled={asking}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {asking && <p className="text-xs text-foreground-secondary">Searching tickets, Slack history, and past agent decisions...</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {answer && (
        <div className="text-sm text-foreground bg-muted/50 border border-border rounded-lg p-3">
          <p>{answer.answer}</p>
          <p className="text-xs text-foreground-secondary mt-2">
            Confidence {Math.round(answer.confidence * 100)}% · {answer.sources_used} sources used
          </p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  const [metrics, setMetrics] = useState<MetricCard[] | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [churnData, setChurnData] = useState<ChurnDataPoint[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAsk, setShowAsk] = useState(false);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getMetrics(), api.getRevenue(), api.getChurn(), api.getInsights()])
      .then(([m, revenue, churn, ins]) => {
        if (cancelled) return;
        setMetrics(buildMetricCards(m));
        setRevenueData(revenue);
        setChurnData(churn.map((c) => ({ month: c.month, rate: c.rate, atRisk: c.atRisk })));
        setInsights(ins as unknown as Insight[]);
      })
      .catch((err) => !cancelled && setError(err.message));

    // The briefing runs four agent calls + a synthesis call server-side, so it's
    // slower than the rest of the dashboard — load it independently and don't
    // block everything else on it.
    api.getBriefing().then((b) => !cancelled && setBriefing(b)).catch((err) => !cancelled && setBriefingError(err.message));
    api.getForecast().then((f) => !cancelled && setForecast(f)).catch(() => {});
    api.getCrisisAlerts().then((a) => !cancelled && setCrisisAlerts(a)).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadInsights = insights.filter((i) => !i.read);
  const criticalCount = insights.filter((i) => i.severity === 'critical' && !i.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold font-heading text-foreground">
            {greeting}, Alex
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Here's what your AI CEO found today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Bell className="w-4 h-4" />
            {criticalCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-destructive pulse-dot ml-1" />
            )}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAsk((v) => !v)}>
            <Sparkles className="w-4 h-4" />
            Ask AI CEO
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      {showAsk && <AskCeoBox onClose={() => setShowAsk(false)} />}

      {/* Crisis Detection — proactive, not waiting for the user to notice */}
      {crisisAlerts.length > 0 && (
        <Link
          to="/command-center"
          className="block bg-destructive/10 border border-destructive/30 rounded-xl p-4 hover:border-destructive/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground font-heading">
                  {crisisAlerts.length === 1 ? '1 active alert' : `${crisisAlerts.length} active alerts`}
                </p>
                <Badge label={crisisAlerts[0].severity} variant={crisisAlerts[0].severity === 'critical' ? 'critical' : 'warning'} />
              </div>
              <p className="text-sm text-foreground-secondary">{crisisAlerts[0].title} — {crisisAlerts[0].explanation}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground-secondary shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {/* Executive Briefing — the multi-agent narrative, not graphs first */}
      {briefing ? (
        <div className="gradient-border rounded-xl">
          <div className="bg-background-card rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-foreground font-heading">
                Executive Briefing — {briefing.date}
              </p>
              <p className="text-sm text-foreground-secondary">{briefing.narrative}</p>
              {briefing.recommended_actions.length > 0 && (
                <p className="text-xs text-foreground-secondary">
                  <span className="text-foreground font-medium">Top recommendation: </span>
                  {briefing.recommended_actions[0]}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-foreground-secondary mt-1 shrink-0" />
          </div>
        </div>
      ) : briefingError ? (
        <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-foreground-secondary">
          Executive briefing unavailable ({briefingError}).
        </div>
      ) : (
        <div className="h-20 rounded-xl bg-background-card border border-border animate-pulse" />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics
          ? metrics.map((metric) => <StatCard key={metric.id} {...metric} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-background-card border border-border animate-pulse" />
            ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={revenueData} />
        <ChurnChart data={churnData} />
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="bg-background-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground font-heading">Next-Month Forecast</p>
            <span className="text-xs text-foreground-secondary">(AI-estimated from real trends, not a trained model)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-foreground-secondary text-xs">Projected revenue</p>
              <p className="text-foreground font-medium">${forecast.next_month_revenue.toLocaleString()} <span className="text-xs text-foreground-secondary">({Math.round(forecast.revenue_confidence * 100)}% conf.)</span></p>
            </div>
            <div>
              <p className="text-foreground-secondary text-xs">Churn outlook</p>
              <p className="text-foreground font-medium">{forecast.churn_forecast}</p>
            </div>
            <div>
              <p className="text-foreground-secondary text-xs">Cash-flow risk</p>
              <p className={`font-medium ${forecast.cash_flow_risk === 'high' ? 'text-destructive' : forecast.cash_flow_risk === 'medium' ? 'text-warning' : 'text-success'}`}>
                {forecast.cash_flow_risk.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Latest Insights */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold font-heading text-foreground">
            Latest AI Insights
          </h2>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
            View all →
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unreadInsights.slice(0, 4).map((insight) => (
            <InsightCard key={insight.id} insight={insight} compact />
          ))}
        </div>
        {unreadInsights.length === 0 && (
          <div className="bg-background-card border border-border rounded-xl p-8 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1 font-heading">
              All caught up
            </p>
            <p className="text-xs text-foreground-secondary">
              No new insights yet. Trigger a workflow from Live Demo, or wait for real Slack events to come in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
