import { generateJSON } from '../llm/groq.js';
import {
  FINANCE_AGENT_SYSTEM,
  SALES_AGENT_SYSTEM,
  SUPPORT_AGENT_SYSTEM,
  MARKETING_AGENT_SYSTEM,
  CEO_SYNTHESIS_SYSTEM,
} from './prompts.js';
import { supabase } from '../db/supabase.js';
import { getDashboardMetrics, getRecentWorkflowRuns, getAllTasks, getMonthlyRevenueHistory } from '../db/queries.js';

interface AgentReport {
  summary: string;
  risks: string[];
  opportunities: string[];
}

async function runFinanceAgent(): Promise<AgentReport> {
  const revenue = await getMonthlyRevenueHistory();
  const metrics = await getDashboardMetrics();
  return generateJSON<AgentReport>(
    FINANCE_AGENT_SYSTEM,
    `Monthly revenue: ${JSON.stringify(revenue)}\nCurrent MRR: $${metrics.mrr}\nCustomer count: ${metrics.customerCount}`
  );
}

async function runSalesAgent(): Promise<AgentReport> {
  const { data: customers } = await supabase.from('customers').select('company, tier, annual_value, value_score').order('annual_value', { ascending: false }).limit(20);
  const runs = await getRecentWorkflowRuns(10);
  return generateJSON<AgentReport>(
    SALES_AGENT_SYSTEM,
    `Top accounts: ${JSON.stringify(customers)}\nRecent agent workflow runs: ${JSON.stringify(
      runs.map((r) => ({ company: (r as { customers?: { company?: string } }).customers?.company, risk: r.risk_level, action: r.recommended_action }))
    )}`
  );
}

async function runSupportAgent(): Promise<AgentReport> {
  const { data: tickets } = await supabase.from('tickets').select('subject, sentiment, status, created_at, customers(company)').order('created_at', { ascending: false }).limit(30);
  return generateJSON<AgentReport>(SUPPORT_AGENT_SYSTEM, `Recent tickets: ${JSON.stringify(tickets)}`);
}

async function runMarketingAgent(): Promise<AgentReport> {
  const metrics = await getDashboardMetrics();
  const { data: engagement } = await supabase.from('engagement_snapshots').select('customer_id, logins_per_week, feature_usage_score, date').order('date', { ascending: false }).limit(30);
  return generateJSON<AgentReport>(
    MARKETING_AGENT_SYSTEM,
    `High-risk accounts: ${metrics.highRiskAccounts} of ${metrics.totalWorkflowRuns} analyzed.\nRecent engagement snapshots: ${JSON.stringify(engagement)}`
  );
}

export interface DailyBriefing {
  narrative: string;
  revenue_summary: string;
  risks: string[];
  opportunities: string[];
  recommended_actions: string[];
  agent_reports: { finance: AgentReport; sales: AgentReport; support: AgentReport; marketing: AgentReport };
}

/**
 * The multi-agent orchestration: four specialist agents analyze their slice
 * of the real data in parallel, then a CEO agent synthesizes their reports
 * into one executive narrative. This is genuine agent orchestration (four
 * distinct LLM calls with distinct system prompts feeding a fifth), not a
 * single prompt pretending to be several roles.
 */
export async function generateDailyBriefing(): Promise<DailyBriefing> {
  const [finance, sales, support, marketing] = await Promise.all([
    runFinanceAgent(),
    runSalesAgent(),
    runSupportAgent(),
    runMarketingAgent(),
  ]);

  const tasks = await getAllTasks(10);

  const synthesis = await generateJSON<Omit<DailyBriefing, 'agent_reports'>>(
    CEO_SYNTHESIS_SYSTEM,
    `FINANCE AGENT REPORT: ${JSON.stringify(finance)}
SALES AGENT REPORT: ${JSON.stringify(sales)}
SUPPORT AGENT REPORT: ${JSON.stringify(support)}
MARKETING AGENT REPORT: ${JSON.stringify(marketing)}
OPEN FOLLOW-UP TASKS: ${JSON.stringify(tasks.map((t) => ({ title: t.title, priority: t.priority, status: t.status })))}`
  );

  return { ...synthesis, agent_reports: { finance, sales, support, marketing } };
}

export async function getOrCreateTodaysBriefing(): Promise<DailyBriefing & { cached: boolean; date: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase.from('daily_briefings').select('*').eq('briefing_date', today).single();

  if (existing) {
    return {
      narrative: existing.narrative,
      revenue_summary: existing.revenue_summary,
      risks: existing.risks,
      opportunities: existing.opportunities,
      recommended_actions: existing.recommended_actions,
      agent_reports: existing.agent_reports,
      cached: true,
      date: today,
    };
  }

  const briefing = await generateDailyBriefing();
  await supabase.from('daily_briefings').insert({
    briefing_date: today,
    narrative: briefing.narrative,
    revenue_summary: briefing.revenue_summary,
    risks: briefing.risks,
    opportunities: briefing.opportunities,
    recommended_actions: briefing.recommended_actions,
    agent_reports: briefing.agent_reports,
  });

  return { ...briefing, cached: false, date: today };
}
