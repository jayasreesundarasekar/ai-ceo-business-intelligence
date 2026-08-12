import { generateJSON } from '../llm/groq.js';
import { CRISIS_NARRATIVE_SYSTEM } from './prompts.js';
import { supabase } from '../db/supabase.js';

export interface CrisisAlert {
  id: string;
  type: 'complaint_spike' | 'high_risk_spike' | 'negative_sentiment_spike';
  severity: 'critical' | 'warning';
  title: string;
  explanation: string;
  recommended_response: string;
  metric: string;
  detected_at: string;
}

/**
 * Proactive detection, not "wait for the user to look at a dashboard".
 * Detection itself is rule-based against real rolling windows (24h vs the
 * preceding 6 days) — the LLM is only used to turn a real, already-true
 * anomaly into a clear executive explanation, never to invent the anomaly.
 */
export async function detectCrises(): Promise<CrisisAlert[]> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: recentTickets }, { data: priorTickets }, { data: recentRuns }, { data: priorRuns }] = await Promise.all([
    supabase.from('tickets').select('id, sentiment, created_at').gte('created_at', dayAgo),
    supabase.from('tickets').select('id, sentiment, created_at').gte('created_at', weekAgo).lt('created_at', dayAgo),
    supabase.from('workflow_runs').select('id, risk_level, started_at').gte('started_at', dayAgo),
    supabase.from('workflow_runs').select('id, risk_level, started_at').gte('started_at', weekAgo).lt('started_at', dayAgo),
  ]);

  const alerts: CrisisAlert[] = [];

  // 1. Support ticket volume spike (last 24h vs. daily average of the prior week).
  const priorDailyAvg = (priorTickets?.length ?? 0) / 6;
  const recentCount = recentTickets?.length ?? 0;
  if (priorDailyAvg >= 1 && recentCount >= priorDailyAvg * 2) {
    const { explanation, recommended_response } = await narrate(
      `Support ticket volume spiked: ${recentCount} tickets in the last 24h vs. a ${priorDailyAvg.toFixed(1)}/day average over the prior week.`
    );
    alerts.push({
      id: 'complaint-spike',
      type: 'complaint_spike',
      severity: recentCount >= priorDailyAvg * 3 ? 'critical' : 'warning',
      title: 'Sudden spike in customer complaints',
      explanation,
      recommended_response,
      metric: `${recentCount} tickets/24h vs. ${priorDailyAvg.toFixed(1)}/day baseline`,
      detected_at: new Date().toISOString(),
    });
  }

  // 2. High/critical churn-risk workflow runs spiking.
  const recentHighRisk = (recentRuns ?? []).filter((r) => r.risk_level === 'high' || r.risk_level === 'critical').length;
  const priorHighRiskDailyAvg = (priorRuns ?? []).filter((r) => r.risk_level === 'high' || r.risk_level === 'critical').length / 6;
  if (priorHighRiskDailyAvg >= 0.5 && recentHighRisk >= priorHighRiskDailyAvg * 2) {
    const { explanation, recommended_response } = await narrate(
      `High/critical churn-risk decisions spiked: ${recentHighRisk} in the last 24h vs. a ${priorHighRiskDailyAvg.toFixed(1)}/day average over the prior week.`
    );
    alerts.push({
      id: 'high-risk-spike',
      type: 'high_risk_spike',
      severity: 'critical',
      title: 'Churn-risk decisions trending up sharply',
      explanation,
      recommended_response,
      metric: `${recentHighRisk} high/critical risk runs/24h vs. ${priorHighRiskDailyAvg.toFixed(1)}/day baseline`,
      detected_at: new Date().toISOString(),
    });
  }

  // 3. Negative-sentiment ticket share spiking.
  const recentNegative = (recentTickets ?? []).filter((t) => t.sentiment === 'negative').length;
  const recentNegativeShare = recentCount ? recentNegative / recentCount : 0;
  const priorNegative = (priorTickets ?? []).filter((t) => t.sentiment === 'negative').length;
  const priorNegativeShare = priorTickets?.length ? priorNegative / priorTickets.length : 0;
  if (recentCount >= 3 && recentNegativeShare >= 0.5 && recentNegativeShare >= priorNegativeShare * 1.5) {
    const { explanation, recommended_response } = await narrate(
      `Negative-sentiment support tickets jumped to ${Math.round(recentNegativeShare * 100)}% of the last 24h's volume, vs. ${Math.round(priorNegativeShare * 100)}% over the prior week.`
    );
    alerts.push({
      id: 'sentiment-spike',
      type: 'negative_sentiment_spike',
      severity: 'warning',
      title: 'Negative sentiment rising in support tickets',
      explanation,
      recommended_response,
      metric: `${Math.round(recentNegativeShare * 100)}% negative (24h) vs. ${Math.round(priorNegativeShare * 100)}% baseline`,
      detected_at: new Date().toISOString(),
    });
  }

  return alerts;
}

async function narrate(factSummary: string): Promise<{ explanation: string; recommended_response: string }> {
  try {
    return await generateJSON<{ explanation: string; recommended_response: string }>(CRISIS_NARRATIVE_SYSTEM, factSummary);
  } catch {
    // LLM unreachable — the alert is still real and worth surfacing with the raw fact.
    return { explanation: factSummary, recommended_response: 'Review the affected accounts/tickets directly — AI narration unavailable.' };
  }
}
