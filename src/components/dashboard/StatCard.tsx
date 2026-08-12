import { DollarSign, Users, Activity, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import type { MetricCard as MetricCardType } from '../../types';

const iconMap = {
  dollar: DollarSign,
  users: Users,
  activity: Activity,
  clock: Clock,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
};

const formatValue = (value: number, format: MetricCardType['format']) => {
  switch (format) {
    case 'currency':
      return `$${(value / 1000).toFixed(1)}K`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
      return value.toLocaleString();
  }
};

export default function StatCard({ title, value, format, trend, trendDirection, sentiment, comparisonLabel, icon }: MetricCardType) {
  const Icon = iconMap[icon];
  const trendColor =
    sentiment === 'positive'
      ? 'text-success'
      : sentiment === 'negative'
        ? 'text-destructive'
        : 'text-foreground-secondary';

  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="card-enter bg-background-card border border-border rounded-xl p-5 hover:border-border-strong transition-colors duration-200 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
      </div>
      <p className="text-sm text-foreground-secondary mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold font-heading text-foreground">
          {formatValue(value, format)}
        </span>
        <span className={`text-sm font-medium ${trendColor}`}>
          {trendArrow} {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-foreground-secondary mt-1">{comparisonLabel}</p>
    </div>
  );
}
