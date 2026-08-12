import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { runAgentWorkflow } from '../agent/pipeline.js';
import { postMessage } from './client.js';

export const eventsRouter = Router();

/**
 * POST /api/slack/events — the single Request URL you register under
 * "Event Subscriptions" in the Slack app config. Handles the one-time URL
 * verification handshake, then real message events.
 */
eventsRouter.post('/', async (req, res) => {
  const body = req.body as {
    type: string;
    challenge?: string;
    team_id?: string;
    event?: { type: string; subtype?: string; bot_id?: string; channel: string; user?: string; text?: string; ts?: string };
  };

  // 1. URL verification handshake (Slack sends this once when you save the Request URL).
  if (body.type === 'url_verification') {
    return res.json({ challenge: body.challenge });
  }

  // 2. Acknowledge immediately — Slack requires a response within 3 seconds.
  res.status(200).send();

  const event = body.event;
  if (!event || event.type !== 'message' || event.bot_id || event.subtype) return;

  try {
    await supabase.from('slack_messages').insert({
      team_id: body.team_id,
      channel: event.channel,
      slack_user_id: event.user,
      text: event.text,
      ts: event.ts,
      raw: body,
    });

    if (!event.text) return;

    // Run the real agent pipeline asynchronously and post the result back to the channel.
    const result = await runAgentWorkflow({ slackMessage: event.text, source: 'slack_event' });
    await postMessage({
      teamId: body.team_id,
      channel: event.channel,
      text: `*${result.customer.company}* — risk: *${result.decision.risk_level}* (${Math.round(result.decision.churn_probability * 100)}% churn probability)\n${result.decision.business_explanation}\nRecommended action: *${result.decision.recommended_action}*\nFollow-up task created: "${result.task.title}"`,
    });
  } catch (err) {
    console.error('Slack event handling failed', err);
  }
});
