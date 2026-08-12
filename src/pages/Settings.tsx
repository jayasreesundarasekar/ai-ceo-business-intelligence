import { useEffect, useState } from 'react';
import { Bot, Bell, Database, Save, Check, ExternalLink } from 'lucide-react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, API_URL, type IntegrationsStatus } from '../lib/api';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [slack, setSlack] = useState<{ connected: boolean; workspace?: string } | null>(null);

  useEffect(() => {
    api.getIntegrationsStatus().then(setIntegrations).catch(() => {});
    api.getSlackStatus().then(setSlack).catch(() => {});
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground">
          Settings
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Configure how your AI CEO behaves and delivers insights.
        </p>
      </div>

      {/* AI CEO Personality */}
      <section className="bg-background-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold font-heading text-foreground">
            AI CEO Configuration
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Analysis sensitivity
            </label>
            <p className="text-xs text-foreground-secondary mb-2">
              Higher sensitivity catches subtle patterns but may generate more alerts.
            </p>
            <select
              defaultValue="medium"
              className="w-full max-w-xs bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="low">Low — Major changes only</option>
              <option value="medium">Medium — Balanced (recommended)</option>
              <option value="high">High — Catch early signals</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Business hours (timezone)
            </label>
            <p className="text-xs text-foreground-secondary mb-2">
              Critical alerts respect these hours. Urgent issues still break through.
            </p>
            <select
              defaultValue="pst"
              className="w-full max-w-xs bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="est">Eastern (EST/EDT)</option>
              <option value="cst">Central (CST/CDT)</option>
              <option value="mst">Mountain (MST/MDT)</option>
              <option value="pst">Pacific (PST/PDT)</option>
              <option value="ist">India (IST)</option>
              <option value="gmt">London (GMT/BST)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Alert Preferences */}
      <section className="bg-background-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold font-heading text-foreground">
            Alert Preferences
          </h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Revenue drops > 10%', desc: 'Notify when revenue drops beyond threshold', enabled: true },
            { label: 'Churn spike detection', desc: 'Detect unusual churn velocity in any region', enabled: true },
            { label: 'Onboarding bottlenecks', desc: 'Flag accounts stuck in onboarding > 3 days', enabled: true },
            { label: 'Competitor mentions', desc: 'Monitor support tickets for competitor names', enabled: false },
            { label: 'Team performance anomalies', desc: 'Detect unusual workload patterns across teams', enabled: false },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{alert.label}</p>
                <p className="text-xs text-foreground-secondary">{alert.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={alert.enabled}
                aria-label={`Toggle ${alert.label}`}
                className={`relative w-10 h-5.5 rounded-full transition-all duration-200 cursor-pointer border ${
                  alert.enabled
                    ? 'bg-primary border-primary'
                    : 'bg-muted border-border'
                }`}
              >
                <span
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                    alert.enabled ? 'left-[calc(100%-18px)]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-background-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-4.5 h-4.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold font-heading text-foreground">
            Integrations
          </h2>
        </div>
        <div className="space-y-3">
          {/* Slack */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Slack</p>
              <p className="text-xs text-foreground-secondary">
                {slack?.connected ? `Connected to ${slack.workspace ?? 'workspace'}` : 'Triggers the AI CEO from real Slack messages'}
              </p>
            </div>
            {slack?.connected ? (
              <Badge label="Connected" variant="success" />
            ) : (
              <Button variant="secondary" size="sm" onClick={() => (window.location.href = `${API_URL}/api/slack/oauth/install`)}>
                Connect
              </Button>
            )}
          </div>

          {/* Jira */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Jira</p>
              <p className="text-xs text-foreground-secondary">
                {integrations?.jira.configured ? 'Ready — creates real issues from AI decisions' : 'Set JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in server/.env'}
              </p>
            </div>
            <Badge label={integrations?.jira.configured ? 'Configured' : 'Not configured'} variant={integrations?.jira.configured ? 'success' : 'neutral'} />
          </div>

          {/* HubSpot */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">HubSpot</p>
              <p className="text-xs text-foreground-secondary">
                {integrations?.hubspot.configured ? 'Ready — syncs contacts and logs AI decisions as notes' : 'Set HUBSPOT_ACCESS_TOKEN in server/.env'}
              </p>
            </div>
            <Badge label={integrations?.hubspot.configured ? 'Configured' : 'Not configured'} variant={integrations?.hubspot.configured ? 'success' : 'neutral'} />
          </div>

          {/* Google (Gmail + Calendar) */}
          <div className="flex items-center justify-between py-2 last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">Google (Gmail + Calendar)</p>
              <p className="text-xs text-foreground-secondary">
                {integrations?.google.connected
                  ? `Connected as ${integrations.google.account ?? 'a Google account'}`
                  : integrations?.google.configured
                    ? 'Configured — connect an account to enable sending'
                    : 'Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in server/.env'}
              </p>
            </div>
            {integrations?.google.connected ? (
              <Badge label="Connected" variant="success" />
            ) : integrations?.google.configured ? (
              <a href={api.googleConnectUrl()} className="inline-flex">
                <Button variant="secondary" size="sm">
                  Connect <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            ) : (
              <Badge label="Not configured" variant="neutral" />
            )}
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button variant="primary" size="md" onClick={handleSave}>
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
        {saved && (
          <span className="text-sm text-success font-medium animate-in fade-in">
            Settings saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
