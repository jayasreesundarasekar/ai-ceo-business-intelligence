import { useEffect, useState } from 'react';
import { Filter, Sparkles } from 'lucide-react';
import InsightCard from '../components/dashboard/InsightCard';
import Button from '../components/shared/Button';
import { api } from '../lib/api';
import type { Insight } from '../types';

const categoryFilters: { label: string; value: Insight['category'] | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Churn', value: 'churn' },
  { label: 'Operations', value: 'operations' },
  { label: 'Bottlenecks', value: 'bottleneck' },
];

export default function Insights() {
  const [activeCategory, setActiveCategory] = useState<Insight['category'] | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getInsights()
      .then((data) => !cancelled && setInsights(data as unknown as Insight[]))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = insights
    .filter((i) => (activeCategory === 'all' ? true : i.category === activeCategory))
    .filter((i) => (showUnreadOnly ? !i.read : true));

  const unreadCount = insights.filter((i) => !i.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold font-heading text-foreground">
            AI Insights
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Your AI CEO has detected {insights.length} insights — {unreadCount} unread.
          </p>
        </div>
        <Button variant="secondary" size="sm">
          <Sparkles className="w-4 h-4" />
          Run Analysis
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-foreground-secondary" />
        {categoryFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveCategory(f.value)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer ${
              activeCategory === f.value
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted text-foreground-secondary border border-border hover:border-border-strong'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer border ${
            showUnreadOnly
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-muted text-foreground-secondary border-border hover:border-border-strong'
          }`}
        >
          Unread only
        </button>
      </div>

      {/* Insights Feed */}
      <div className="space-y-4">
        {filtered.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
        {filtered.length === 0 && (
          <div className="bg-background-card border border-border rounded-xl p-12 text-center">
            <Sparkles className="w-10 h-10 text-foreground-secondary mx-auto mb-4" />
            <p className="text-base font-semibold text-foreground mb-1 font-heading">
              No insights match your filters
            </p>
            <p className="text-sm text-foreground-secondary">
              Try adjusting your category or unread filters — your AI CEO is always watching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}