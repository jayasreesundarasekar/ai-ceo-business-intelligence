import { Router } from 'express';
import { runAgentWorkflow } from '../agent/pipeline.js';
import { askKnowledgeBase } from '../agent/knowledgeBase.js';
import { getOrCreateTodaysBriefing } from '../agent/multiAgent.js';

export const commandsRouter = Router();

/**
 * POST /api/slack/commands — single Request URL that routes by which slash
 * command Slack sends (register all three under "Slash Commands" in the
 * Slack app config, all pointing here):
 *   /churn-check [customer]  — runs the full agent pipeline on demand
 *   /ask-ceo [question]      — Q&A over real stored business data
 *   /briefing                — today's executive briefing (multi-agent)
 * Body is application/x-www-form-urlencoded (parsed by express.urlencoded in index.ts).
 */
commandsRouter.post('/', async (req, res) => {
  const { command, text, response_url } = req.body as { command: string; text: string; response_url: string };

  if (command === '/ask-ceo') {
    res.json({ response_type: 'ephemeral', text: `Looking into "${text}"...` });
    try {
      const result = await askKnowledgeBase(text);
      await postFollowUp(response_url, {
        response_type: 'in_channel',
        text: `*Q: ${text}*\n${result.answer}\n_(confidence ${Math.round(result.confidence * 100)}%, ${result.sources_used} sources used)_`,
      });
    } catch (err) {
      console.error('ask-ceo command failed', err);
      await postFollowUp(response_url, { response_type: 'ephemeral', text: 'Something went wrong answering that — check server logs.' });
    }
    return;
  }

  if (command === '/briefing') {
    res.json({ response_type: 'ephemeral', text: 'Generating today\'s executive briefing...' });
    try {
      const b = await getOrCreateTodaysBriefing();
      await postFollowUp(response_url, {
        response_type: 'in_channel',
        text: `*Executive Briefing — ${b.date}*`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: b.narrative } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Risks:*\n${b.risks.map((r) => `• ${r}`).join('\n')}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Recommended actions:*\n${b.recommended_actions.map((a) => `• ${a}`).join('\n')}` } },
        ],
      });
    } catch (err) {
      console.error('briefing command failed', err);
      await postFollowUp(response_url, { response_type: 'ephemeral', text: 'Something went wrong generating the briefing — check server logs.' });
    }
    return;
  }

  // Default: /churn-check — acknowledge within 3 seconds, then follow up via response_url once the LLM finishes.
  res.json({ response_type: 'ephemeral', text: `Running churn analysis for "${text || 'your top account'}"...` });

  try {
    const result = await runAgentWorkflow({ slackMessage: text || `${text} is unhappy`, source: 'slash_command' });
    await postFollowUp(response_url, {
      response_type: 'in_channel',
      text: `*${command} result for ${result.customer.company}*`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*Risk level:* ${result.decision.risk_level} (${Math.round(result.decision.churn_probability * 100)}% churn probability)\n*Recommended action:* ${result.decision.recommended_action}\n*Why:* ${result.decision.business_explanation}` } },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: 'Approve action' }, style: 'primary', action_id: 'approve_action', value: result.id },
            { type: 'button', text: { type: 'plain_text', text: 'Dismiss' }, action_id: 'dismiss_action', value: result.id },
          ],
        },
      ],
    });
  } catch (err) {
    console.error('Slash command handling failed', err);
    await postFollowUp(response_url, { response_type: 'ephemeral', text: 'Something went wrong running the analysis — check server logs.' });
  }
});

async function postFollowUp(responseUrl: string, payload: Record<string, unknown>) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
