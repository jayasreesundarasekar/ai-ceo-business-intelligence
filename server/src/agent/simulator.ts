import { generateJSON } from '../llm/groq.js';
import { SIMULATOR_SYSTEM } from './prompts.js';
import { getDashboardMetrics } from '../db/queries.js';
import { supabase } from '../db/supabase.js';

export interface SimulationResult {
  scenario: string;
  revenue_impact: { direction: 'increase' | 'decrease' | 'neutral'; estimate_dollars: number; estimate_percent: number; reasoning: string };
  churn_impact: { direction: 'increase' | 'decrease' | 'neutral'; estimate_percent_points: number; reasoning: string };
  profit_impact: { direction: 'increase' | 'decrease' | 'neutral'; estimate_dollars: number; reasoning: string };
  customer_satisfaction_impact: { direction: 'increase' | 'decrease' | 'neutral'; reasoning: string };
  confidence: number;
  risks: string[];
  recommendation: string;
}

/**
 * "What happens if we give a 20% discount to all premium customers?" — a
 * before-you-act planning tool. Grounded in real current metrics (MRR,
 * customer count, tier mix) rather than a hardcoded elasticity model, and
 * explicit that it's a reasoned LLM estimate, not a trained simulation.
 */
export async function runSimulation(scenario: string): Promise<SimulationResult> {
  const metrics = await getDashboardMetrics();
  const { data: tierBreakdown } = await supabase.from('customers').select('tier, annual_value');

  const byTier = new Map<string, { count: number; totalAnnualValue: number }>();
  for (const c of tierBreakdown ?? []) {
    const entry = byTier.get(c.tier) ?? { count: 0, totalAnnualValue: 0 };
    entry.count += 1;
    entry.totalAnnualValue += Number(c.annual_value);
    byTier.set(c.tier, entry);
  }
  const tierSummary = Array.from(byTier.entries())
    .map(([tier, v]) => `${tier}: ${v.count} customers, $${Math.round(v.totalAnnualValue).toLocaleString()} combined annual value`)
    .join('\n');

  return generateJSON<SimulationResult>(
    SIMULATOR_SYSTEM,
    `PROPOSED SCENARIO: "${scenario}"

CURRENT BUSINESS METRICS
Monthly Recurring Revenue: $${metrics.mrr.toLocaleString()}
Customers: ${metrics.customerCount}
Current high-risk (churn) rate across analyzed accounts: ${metrics.churnRate}%
Total agent workflow runs analyzed: ${metrics.totalWorkflowRuns}

CUSTOMER TIER BREAKDOWN
${tierSummary || 'no customer data yet'}`
  );
}
