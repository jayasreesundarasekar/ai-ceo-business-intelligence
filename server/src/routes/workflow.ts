import { Router } from 'express';
import { z } from 'zod';
import { runAgentWorkflow } from '../agent/pipeline.js';
import { getRecentWorkflowRuns, getWorkflowRunById, recordDecisionFeedback } from '../db/queries.js';
import { broadcast } from '../ws.js';

export const workflowRouter = Router();

const triggerSchema = z.object({ slackMessage: z.string().min(1) });

workflowRouter.post('/trigger', async (req, res) => {
  const parsed = triggerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const result = await runAgentWorkflow({ slackMessage: parsed.data.slackMessage, source: 'manual' });
    broadcast('workflow.completed', {
      id: result.id,
      customer: result.customer?.company,
      recommendedAction: result.decision?.recommended_action,
      riskLevel: result.decision?.risk_level,
    });
    res.json(result);
  } catch (err) {
    console.error('Workflow run failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Approve/Reject workflow — records a human decision on an AI recommendation.
// This is what actually populates decision_feedback, which the Evaluation
// page, health score, and confidence calibration all read from.
const feedbackSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewer: z.string().optional(),
});

workflowRouter.post('/:id/feedback', async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const run = await getWorkflowRunById(req.params.id);
    const feedback = await recordDecisionFeedback({
      workflow_run_id: run.id,
      customer_id: run.customer_id,
      recommended_action: run.recommended_action ?? 'unspecified action',
      decision: parsed.data.decision,
      source: 'dashboard',
      reviewer: parsed.data.reviewer ?? 'Alex (exec)',
    });
    broadcast('feedback.recorded', { workflowRunId: run.id, decision: parsed.data.decision, recommendedAction: run.recommended_action });
    res.json(feedback);
  } catch (err) {
    console.error('Recording feedback failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

workflowRouter.get('/recent', async (_req, res) => {
  try {
    res.json(await getRecentWorkflowRuns());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Explainable AI: the full "why" trail for one decision — data sources
// consulted, reasoning, confidence, assumptions/missing info, alternatives —
// all pulled from what was actually stored for that run, no re-generation.
workflowRouter.get('/:id/explain', async (req, res) => {
  try {
    const run = await getWorkflowRunById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Workflow run not found' });
    const raw = (run.raw_llm_response ?? {}) as { decision?: { missing_information?: string[]; alternative_actions?: string[] }; sentiment?: { reason?: string } };
    const customer = (run as { customers?: { name?: string; company?: string } }).customers;
    res.json({
      id: run.id,
      recommended_action: run.recommended_action,
      business_explanation: run.business_explanation,
      confidence: run.action_confidence,
      risk_level: run.risk_level,
      churn_probability: run.churn_probability,
      data_sources_consulted: [
        customer ? `Customer profile: ${customer.name} @ ${customer.company}` : null,
        'Purchase history',
        'Engagement trend (logins, feature usage, NPS)',
        'Recent support tickets',
        'Conversation memory (past decisions for this account)',
        'Learned preferences (historical human approval rate by action type)',
        `Triggering event: "${run.slack_message}" (sentiment: ${run.sentiment ?? 'unknown'}${raw.sentiment?.reason ? ' — ' + raw.sentiment.reason : ''})`,
      ].filter(Boolean),
      missing_information: raw.decision?.missing_information ?? [],
      alternative_actions: raw.decision?.alternative_actions ?? [],
      started_at: run.started_at,
      completed_at: run.completed_at,
    });
  } catch (err) {
    console.error('Explain lookup failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
