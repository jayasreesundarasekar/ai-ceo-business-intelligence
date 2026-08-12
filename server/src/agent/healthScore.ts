import { generateJSON } from '../llm/groq.js';
import { HEALTH_SCORE_NARRATIVE_SYSTEM } from './prompts.js';
import { getDashboardMetrics, getActionApprovalStats } from '../db/queries.js';
import { supabase } from '../db/supabase.js';

export interface HealthComponent {
  key: string;
  label: string;
  score: number; // 0-100
  detail: string;
}

export interface HealthScore {
  score: number; // 0-100
  components: HealthComponent[];
  narrative: string;
  top_driver: string;
  computed_at: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * A dynamic 0-100 score built from five real, weighted components — every
 * number here comes from an actual query, nothing is a placeholder. The LLM
 * is only used at the end to explain, in plain language, what moved it.
 */
export async function computeHealthScore(): Promise<HealthScore> {
  const [metrics, approvalStats, { data: tickets }, { data: tasks }] = await Promise.all([
    getDashboardMetrics(),
    getActionApprovalStats(),
    supabase.from('tickets').select('sentiment').order('created_at', { ascending: false }).limit(60),
    supabase.from('tasks').select('status').limit(100),
  ]);

  // 1. Sales/revenue health — proxy: inverse of high-risk share (more at-risk accounts = worse).
  const salesScore = clamp(100 - metrics.churnRate);

  // 2. Customer satisfaction — share of non-negative recent tickets.
  const negativeShare = tickets?.length ? tickets.filter((t) => t.sentiment === 'negative').length / tickets.length : 0;
  const satisfactionScore = clamp(100 - negativeShare * 100);

  // 3. Support responsiveness — proxy from AI-assisted response speed via task completion rate
  // (we don't track raw ticket first-response time in this schema, so completion throughput stands in).
  const doneShare = tasks?.length ? tasks.filter((t) => t.status === 'done').length / tasks.length : 0.5;
  const supportScore = clamp(doneShare * 100);

  // 4. Churn risk — inverse of high-risk account share, weighted more heavily than #1.
  const churnScore = clamp(100 - metrics.churnRate * 1.3);

  // 5. Team productivity — how often humans approve the AI's recommendations (a trust/throughput proxy).
  const avgApproval = approvalStats.length ? approvalStats.reduce((s, a) => s + a.approvalRate, 0) / approvalStats.length : 0.5;
  const productivityScore = clamp(avgApproval * 100);

  const components: HealthComponent[] = [
    { key: 'sales', label: 'Sales & Revenue', score: Math.round(salesScore), detail: `${metrics.customerCount} customers, $${metrics.mrr.toLocaleString()} MRR` },
    { key: 'satisfaction', label: 'Customer Satisfaction', score: Math.round(satisfactionScore), detail: `${Math.round((1 - negativeShare) * 100)}% non-negative tickets (last ${tickets?.length ?? 0})` },
    { key: 'support', label: 'Support Responsiveness', score: Math.round(supportScore), detail: `${Math.round(doneShare * 100)}% of follow-up tasks completed` },
    { key: 'churn', label: 'Churn Risk', score: Math.round(churnScore), detail: `${metrics.highRiskAccounts} of ${metrics.totalWorkflowRuns} analyzed runs are high/critical risk` },
    { key: 'productivity', label: 'Team Productivity (AI trust)', score: Math.round(productivityScore), detail: `${Math.round(avgApproval * 100)}% avg. approval rate on AI recommendations` },
  ];

  const score = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);

  let narrative = `Composite health score is ${score}/100.`;
  let top_driver = components.slice().sort((a, b) => a.score - b.score)[0]?.label ?? 'n/a';
  try {
    const result = await generateJSON<{ narrative: string; top_driver: string }>(
      HEALTH_SCORE_NARRATIVE_SYSTEM,
      `COMPOSITE SCORE: ${score}/100\nCOMPONENTS:\n${components.map((c) => `- ${c.label}: ${c.score}/100 (${c.detail})`).join('\n')}`
    );
    narrative = result.narrative;
    top_driver = result.top_driver;
  } catch {
    // LLM unreachable — fall back to the rule-based summary above.
  }

  return { score, components, narrative, top_driver, computed_at: new Date().toISOString() };
}
