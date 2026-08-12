import { useState } from 'react';
import { Mic, ListChecks, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { api, type MeetingAnalysis } from '../lib/api';

const placeholder = `Paste a meeting transcript here, e.g.:

Sarah: We need to follow up with XYZ Corp before Friday, their renewal is at risk.
Mike: I can own that — I'll draft the retention offer.
Priya: Support volume is up this week, we still haven't decided on adding headcount.
Sarah: Let's revisit that next week, not blocking right now.`;

export default function Meeting() {
  const [transcript, setTranscript] = useState('');
  const [createTasks, setCreateTasks] = useState(true);
  const [result, setResult] = useState<MeetingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (transcript.trim().length < 10) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.analyzeMeeting(transcript, createTasks));
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
          <Mic className="w-5 h-5 text-primary" />
          Meeting Companion
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Paste a transcript — the AI summarizes it, extracts action items with owners, and flags what's
          still unresolved.
        </p>
      </div>

      <div className="bg-background-card border border-border rounded-xl p-5 space-y-3">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary/50 resize-y"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-foreground-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={createTasks}
              onChange={(e) => setCreateTasks(e.target.checked)}
              className="rounded border-border"
            />
            Create real follow-up tasks from action items
          </label>
          <Button variant="primary" onClick={run} disabled={loading || transcript.trim().length < 10}>
            <Send className="w-4 h-4" />
            Analyze Meeting
          </Button>
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

      {result && !loading && (
        <div className="space-y-4">
          <div className="bg-background-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-foreground-secondary mb-1">Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
          </div>

          {result.key_decisions.length > 0 && (
            <div className="bg-background-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-foreground-secondary mb-2">Key Decisions</p>
              <ul className="space-y-1.5">
                {result.key_decisions.map((d, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-background-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold font-heading text-foreground">Action Items</p>
              </div>
              {result.tasks_created > 0 && <Badge label={`${result.tasks_created} tasks created`} variant="success" />}
            </div>
            <div className="space-y-2">
              {result.action_items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.title}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5">
                      {item.owner} · {item.due_hint}
                    </p>
                  </div>
                  <Badge
                    label={item.priority}
                    variant={item.priority === 'high' ? 'critical' : item.priority === 'medium' ? 'warning' : 'neutral'}
                  />
                </div>
              ))}
              {result.action_items.length === 0 && (
                <p className="text-sm text-foreground-secondary">No clear action items detected.</p>
              )}
            </div>
          </div>

          {result.unresolved_issues.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <p className="text-sm font-semibold font-heading text-foreground">Unresolved Issues</p>
              </div>
              <ul className="space-y-1.5">
                {result.unresolved_issues.map((u, i) => (
                  <li key={i} className="text-sm text-foreground-secondary flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span> {u}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
