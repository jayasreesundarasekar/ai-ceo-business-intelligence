import { generateJSON } from '../llm/groq.js';
import { DEBATE_SALES_SYSTEM, DEBATE_FINANCE_SYSTEM, DEBATE_SUPPORT_SYSTEM, DEBATE_CEO_SYSTEM } from './prompts.js';
import { getDashboardMetrics } from '../db/queries.js';

interface DebateArgument {
  position: string;
  argument: string;
}

export interface DebateResult {
  topic: string;
  sales: DebateArgument;
  finance: DebateArgument;
  support: DebateArgument;
  ceo_decision: string;
  ceo_reasoning: string;
  ceo_confidence: number;
}

/**
 * Three specialist agents argue a specific decision from genuinely different
 * incentives (grow revenue / protect margin / protect satisfaction), each a
 * distinct LLM call so the disagreement is real rather than scripted, then a
 * fourth CEO call weighs the arguments against each other and decides.
 */
export async function runDebate(topic: string): Promise<DebateResult> {
  const metrics = await getDashboardMetrics();
  const context = `DECISION UNDER DEBATE: "${topic}"

CURRENT BUSINESS CONTEXT
MRR: $${metrics.mrr.toLocaleString()}
Customers: ${metrics.customerCount}
High-risk (churn) rate: ${metrics.churnRate}%
Total agent workflow runs analyzed: ${metrics.totalWorkflowRuns}`;

  const [sales, finance, support] = await Promise.all([
    generateJSON<DebateArgument>(DEBATE_SALES_SYSTEM, context),
    generateJSON<DebateArgument>(DEBATE_FINANCE_SYSTEM, context),
    generateJSON<DebateArgument>(DEBATE_SUPPORT_SYSTEM, context),
  ]);

  const ceo = await generateJSON<{ final_decision: string; reasoning: string; confidence: number }>(
    DEBATE_CEO_SYSTEM,
    `${context}

SALES AGENT — position: ${sales.position}\nargument: ${sales.argument}
FINANCE AGENT — position: ${finance.position}\nargument: ${finance.argument}
SUPPORT AGENT — position: ${support.position}\nargument: ${support.argument}`
  );

  return {
    topic,
    sales,
    finance,
    support,
    ceo_decision: ceo.final_decision,
    ceo_reasoning: ceo.reasoning,
    ceo_confidence: ceo.confidence,
  };
}
