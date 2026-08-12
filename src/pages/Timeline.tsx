import { useEffect, useState } from 'react';
import { MessageSquare, Zap, CheckSquare, ThumbsUp, ThumbsDown, Radio } from 'lucide-react';
import Badge from '../components/shared/Badge';
import { api, type TimelineEvent } from '../lib/api';

const typeConfig: Record<TimelineEvent['type'], { icon: typeof MessageSquare; label: string; variant: 'info' | 'critical' | 'success' | 'neutral' }> = {
  slack_message: { icon: MessageSquare, label: 'Slack', variant: 'info' },
  workflow_started: { icon: Radio, label: 'Agent started', variant: 'neutral' },
  workflow_completed: { icon: Zap, label: 'Agent decided', variant: 'critical' },
  task_created: { icon: CheckSquare, label: 'Task', variant: 'success' },
  feedback: { icon: ThumbsUp, label: 'Feedback', variant: 'neutral' },
};

export default function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getTimeline()
      .then((data) => !cancelled && setEvents(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground">Business Timeline</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Every Slack event, agent decision, task, and human review — in the order it actually happened.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-background-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!loading && events.length === 0 && !error && (
        <div className="bg-background-card border border-border rounded-xl p-12 text-center">
          <Radio className="w-10 h-10 text-foreground-secondary mx-auto mb-4" />
          <p className="text-base font-semibold text-foreground mb-1 font-heading">Nothing here yet</p>
          <p className="text-sm text-foreground-secondary">
            Trigger a workflow from Live Demo, or connect Slack — this feed fills in as real events happen.
          </p>
        </div>
      )}

      <div className="relative pl-6 space-y-4">
        {events.length > 0 && <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />}
        {events.map((event, i) => {
          const cfg = typeConfig[event.type];
          const Icon = event.type === 'feedback' && event.summary.includes('rejected') ? ThumbsDown : cfg.icon;
          return (
            <div key={i} className="relative flex items-start gap-3">
              <div className="absolute -left-6 w-4.5 h-4.5 rounded-full bg-background-card border-2 border-border flex items-center justify-center">
                <Icon className="w-2.5 h-2.5 text-foreground-secondary" />
              </div>
              <div className="flex-1 bg-background-card border border-border rounded-xl p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <Badge label={cfg.label} variant={cfg.variant} />
                  <span className="text-xs text-foreground-secondary">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{event.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
