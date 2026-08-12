import { useEffect, useState } from 'react';
import { MessageSquare, Check, Copy, ExternalLink, Bot, Bell } from 'lucide-react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, API_URL } from '../lib/api';

const channelConfigs = [
  {
    id: 'daily-digest',
    channel: '#ai-daily-digest',
    description: 'Morning summary of KPIs, revenue trends, and flagged accounts.',
    enabled: true,
    frequency: 'Daily at 9 AM',
  },
  {
    id: 'critical-alerts',
    channel: '#ai-critical-alerts',
    description: 'Real-time critical alerts — churn risk, revenue drops, operational incidents.',
    enabled: true,
    frequency: 'Instant',
  },
  {
    id: 'weekly-report',
    channel: '#ai-weekly-report',
    description: 'Full weekly report with charts, trends, and exec summary.',
    enabled: true,
    frequency: 'Weekly on Monday',
  },
  {
    id: 'onboarding-alerts',
    channel: '#ai-onboarding',
    description: 'New account onboarding bottlenecks and delayed setups.',
    enabled: false,
    frequency: 'Daily at 10 AM',
  },
];

export default function Slack() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; workspace?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSlackStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
        Couldn't reach the backend ({error}). Is it running? See server/README.md.
      </div>
    );
  }

  if (!status) {
    return <div className="h-40 rounded-xl bg-background-card border border-border animate-pulse" />;
  }

  if (!status.connected) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-foreground-secondary" />
        </div>
        <h1 className="text-xl font-semibold font-heading text-foreground mb-2">
          Connect Slack
        </h1>
        <p className="text-sm text-foreground-secondary mb-8">
          Link your Slack workspace so your AI CEO can deliver insights directly to your team's channels.
          Requires a Slack app to be configured on the backend first — see server/README.md.
        </p>
        <Button variant="primary" size="md" onClick={() => (window.location.href = `${API_URL}/api/slack/oauth/install`)}>
          <ExternalLink className="w-4 h-4" />
          Connect Slack Workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold font-heading text-foreground">
            Slack Integration
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Your AI CEO sends insights to your team via Slack.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge label="Connected" variant="success" dot />
          <Button variant="secondary" size="sm" onClick={() => (window.location.href = `${API_URL}/api/slack/oauth/install`)}>
            <ExternalLink className="w-4 h-4" />
            Reconnect
          </Button>
        </div>
      </div>

      {/* Status card */}
      <div className="bg-background-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground font-heading mb-1">
              AI CEO Bot is active
            </p>
            <p className="text-sm text-foreground-secondary">
              Connected to <span className="text-foreground font-medium">{status.workspace ?? 'your'}</span> workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-success font-medium">● Online</span>
          </div>
        </div>
      </div>

      {/* Channel configurations */}
      <div>
        <h2 className="text-base font-semibold font-heading text-foreground mb-4">
          Channel Configurations
        </h2>
        <div className="space-y-3">
          {channelConfigs.map((ch) => (
            <div
              key={ch.id}
              className="bg-background-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-border-strong transition-colors duration-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  ch.enabled ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Bell className={`w-4.5 h-4.5 ${ch.enabled ? 'text-primary' : 'text-foreground-secondary'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground font-heading">
                    {ch.channel}
                  </p>
                  <p className="text-xs text-foreground-secondary mt-0.5">
                    {ch.description}
                  </p>
                  <p className="text-xs text-foreground-secondary mt-1">
                    {ch.frequency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  role="switch"
                  aria-checked={ch.enabled}
                  aria-label={`Toggle ${ch.channel}`}
                  className={`relative w-10 h-5.5 rounded-full transition-all duration-200 cursor-pointer border ${
                    ch.enabled
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-border'
                  }`}
                >
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                      ch.enabled ? 'left-[calc(100%-18px)]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test command */}
      <div className="bg-background-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold font-heading text-foreground mb-3">
          Test in Slack
        </h3>
        <p className="text-sm text-foreground-secondary mb-3">
          Try this slash command in any channel to test the bot:
        </p>
        <div className="bg-muted border border-border rounded-lg px-4 py-3 flex items-center justify-between">
          <code className="text-sm font-mono text-foreground">/churn-check Acme Corp</code>
          <button
            onClick={() => handleCopy('/churn-check Acme Corp')}
            className="text-foreground-secondary hover:text-foreground transition-colors duration-150 cursor-pointer"
            aria-label="Copy command"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-foreground-secondary">
            <span className="font-mono font-medium text-foreground">/churn-check [customer]</span> — Runs the real agent pipeline (Groq + Supabase) and replies with risk level, recommended action, and Approve/Dismiss buttons.
          </p>
          <p className="text-xs text-foreground-secondary">
            Posting a message in any channel the bot is in also triggers the agent automatically via the Events API.
          </p>
        </div>
      </div>
    </div>
  );
}
