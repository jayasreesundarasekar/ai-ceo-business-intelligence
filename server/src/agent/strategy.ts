import { generateJSON } from '../llm/groq.js';
import { STRATEGY_SYSTEM } from './prompts.js';
import { getDashboardMetrics } from '../db/queries.js';
import { supabase } from '../db/supabase.js';

export interface StrategyPlan {
  title: string;
  summary: string;
  initiatives: Array<{ title: string; description: string; expected_impact: string; timeline: string }>;
  risks: string[];
  success_metrics: string[];
  expected_roi: string;
  timeline: string;
}

/** "How can we grow revenue by 20% next quarter?" — a grounded growth plan,
 * not today's-issues triage like the daily briefing. */
export async function generateStrategy(goal: string): Promise<StrategyPlan> {
  const metrics = await getDashboardMetrics();
  const { data: topAccounts } = await supabase
    .from('customers')
    .select('company, tier, annual_value, value_score')
    .order('annual_value', { ascending: false })
    .limit(5);

  return generateJSON<StrategyPlan>(
    STRATEGY_SYSTEM,
    `GOAL: "${goal}"

CURRENT METRICS
MRR: $${metrics.mrr.toLocaleString()}
Customers: ${metrics.customerCount}
High-risk rate: ${metrics.churnRate}%
Total agent workflow runs: ${metrics.totalWorkflowRuns}

TOP ACCOUNTS
${(topAccounts ?? []).map((a) => `- ${a.company} (${a.tier}): $${Number(a.annual_value).toLocaleString()}/yr, value score ${a.value_score}/100`).join('\n') || 'none on file'}`
  );
}
