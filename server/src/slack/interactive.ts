import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { appendMemory, updateWorkflowRun, insertFeedback } from '../db/queries.js';

export const interactiveRouter = Router();

/**
 * POST /api/slack/interactive — Request URL under "Interactivity & Shortcuts".
 * Handles button clicks from messages posted by commands.ts / events.ts
 * (e.g. "Approve action" / "Dismiss"). Slack sends this as
 * application/x-www-form-urlencoded with a `payload` field containing JSON.
 */
interactiveRouter.post('/', async (req, res) => {
  res.status(200).send();

  try {
    const payload = JSON.parse(req.body.payload as string) as {
      actions: Array<{ action_id: string; value: string }>;
      user: { id: string; username?: string };
      response_url: string;
    };
    const action = payload.actions?.[0];
    if (!action) return;

    const workflowRunId = action.value;
    const { data: run } = await supabase.from('workflow_runs').select('customer_id, recommended_action').eq('id', workflowRunId).single();

    if (action.action_id === 'approve_action') {
      await updateWorkflowRun(workflowRunId, { status: 'completed' });
      if (run) {
        await insertFeedback({
          workflow_run_id: workflowRunId,
          customer_id: run.customer_id,
          recommended_action: run.recommended_action ?? 'unknown',
          decision: 'approved',
          source: 'slack',
          reviewer: payload.user.username ?? payload.user.id,
        });
      }
      if (run?.customer_id) {
        await appendMemory({
          customer_id: run.customer_id,
          workflow_run_id: workflowRunId,
          role: 'note',
          content: `Recommended action approved in Slack by ${payload.user.username ?? payload.user.id}.`,
        });
      }
      await respond(payload.response_url, '✅ Action approved and logged.');
    } else if (action.action_id === 'dismiss_action') {
      if (run) {
        await insertFeedback({
          workflow_run_id: workflowRunId,
          customer_id: run.customer_id,
          recommended_action: run.recommended_action ?? 'unknown',
          decision: 'rejected',
          source: 'slack',
          reviewer: payload.user.username ?? payload.user.id,
        });
      }
      if (run?.customer_id) {
        await appendMemory({
          customer_id: run.customer_id,
          workflow_run_id: workflowRunId,
          role: 'note',
          content: `Recommended action dismissed in Slack by ${payload.user.username ?? payload.user.id}.`,
        });
      }
      await respond(payload.response_url, '❌ Dismissed — noted for future context.');
    }
  } catch (err) {
    console.error('Slack interactive handling failed', err);
  }
});

async function respond(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replace_original: false, text }),
  }).catch(() => {});
}
