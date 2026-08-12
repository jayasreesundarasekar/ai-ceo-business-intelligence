import { Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'insight' | 'report' | 'slack' | 'general';
}

const icons = {
  insight: Lightbulb,
  report: Lightbulb,
  slack: Lightbulb,
  general: Lightbulb,
};

export default function EmptyState({ title, description, icon = 'general' }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-foreground-secondary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2 font-heading">{title}</h3>
      <p className="text-sm text-foreground-secondary max-w-sm">{description}</p>
    </div>
  );
}
