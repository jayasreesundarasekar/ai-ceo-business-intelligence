import { useState } from 'react';
import { ThumbsUp, ThumbsDown, ExternalLink, Loader2, Ticket, Mail, CalendarPlus, Building2, Check } from 'lucide-react';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { api } from '../../lib/api';

type ActionKey = 'jira' | 'gmail' | 'calendar' | 'hubspot';

interface ActionState {
  loading: boolean;
  result?: string;
  link?: string;
  error?: string;
}

const actionMeta: Record<ActionKey, { icon: typeof Ticket; label: string; run: (id: string) => Promise<{ result: string; link?: string }> }> = {
  jira: {
    icon: Ticket,
    label: 'Create Jira Ticket',
    run: async (id) => {
      const r = await api.createJiraTask(id);
      return { result: `Created ${r.key}`, link: r.url };
    },
  },
  gmail: {
    icon: Mail,
    label: 'Send via Gmail',
    run: async (id) => {
      await api.sendViaGmail(id);
      return { result: 'Email sent' };
    },
  },
  calendar: {
    icon: CalendarPlus,
    label: 'Schedule Follow-up',
    run: async (id) => {
      const r = await api.scheduleFollowup(id);
      return { result: 'Event scheduled', link: r.htmlLink };
    },
  },
  hubspot: {
    icon: Building2,
    label: 'Sync to HubSpot',
    run: async (id) => {
      await api.syncToHubspot(id);
      return { result: 'Synced to CRM' };
    },
  },
};

/** Approve/Reject (records real decision_feedback) + one-click real integration actions. */
export default function WorkflowActions({ workflowRunId }: { workflowRunId: string }) {
  const [feedback, setFeedback] = useState<'approved' | 'rejected' | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [actions, setActions] = useState<Partial<Record<ActionKey, ActionState>>>({});

  const submitFeedback = async (decision: 'approved' | 'rejected') => {
    setFeedbackError(null);
    try {
      await api.submitFeedback(workflowRunId, decision);
      setFeedback(decision);
    } catch (err) {
      setFeedbackError((err as Error).message);
    }
  };

  const runAction = async (key: ActionKey) => {
    setActions((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const { result, link } = await actionMeta[key].run(workflowRunId);
      setActions((prev) => ({ ...prev, [key]: { loading: false, result, link } }));
    } catch (err) {
      setActions((prev) => ({ ...prev, [key]: { loading: false, error: (err as Error).message } }));
    }
  };

  return (
    <div className="bg-background-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold font-heading text-foreground mb-2">Review this decision</p>
        {feedback ? (
          <Badge label={feedback === 'approved' ? 'Approved' : 'Rejected'} variant={feedback === 'approved' ? 'success' : 'critical'} />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => submitFeedback('approved')}>
              <ThumbsUp className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={() => submitFeedback('rejected')}>
              <ThumbsDown className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        )}
        {feedbackError && <p className="text-xs text-destructive mt-2">{feedbackError}</p>}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-foreground-secondary mb-2">Execute the workflow for real</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(actionMeta) as ActionKey[]).map((key) => {
            const { icon: Icon, label } = actionMeta[key];
            const state = actions[key];
            return (
              <div key={key} className="flex flex-col gap-1">
                <Button variant="secondary" size="sm" onClick={() => runAction(key)} disabled={state?.loading}>
                  {state?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state?.result ? <Check className="w-3.5 h-3.5 text-success" /> : <Icon className="w-3.5 h-3.5" />}
                  {label}
                </Button>
                {state?.result && (
                  <p className="text-[11px] text-success flex items-center gap-1">
                    {state.result}
                    {state.link && (
                      <a href={state.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                        view <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </p>
                )}
                {state?.error && <p className="text-[11px] text-destructive max-w-[220px]">{state.error}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
