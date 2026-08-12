import { generateJSON, generateText } from '../llm/groq.js';
import { SENTIMENT_SYSTEM, DECISION_SYSTEM, DRAFT_MESSAGE_SYSTEM } from './prompts.js';
import {
  findCustomerByNameOrCompany,
  getMostValuableCustomer,
  getPurchaseHistory,
  getEngagementHistory,
  getRecentTickets,
  getConversationMemory,
  appendMemory,
  insertTask,
  createWorkflowRun,
  updateWorkflowRun,
  getActionApprovalStats,
  type Customer,
} from '../db/queries.js';

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  reason: string;
}

interface DecisionResult {
  churn_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  confidence: number;
  business_explanation: string;
  discount: { type: string; value: number; reason: string } | null;
  task: { title: string; description: string; priority: 'high' | 'medium' | 'low'; assignee: string; due_in_hours: number };
  missing_information?: string[];
  alternative_actions?: string[];
}

interface DraftResult {
  channel: 'email' | 'slack';
  subject: string | null;
  body: string;
  tone: string;
}

export interface AgentStepLog {
  step: number;
  name: string;
  detail: string;
}

export interface WorkflowRunResult {
  id: string;
  slackMessage: string;
  customer: Customer;
  purchaseHistory: Awaited<ReturnType<typeof getPurchaseHistory>>;
  engagementData: Awaited<ReturnType<typeof getEngagementHistory>>;
  tickets: Awaited<ReturnType<typeof getRecentTickets>>;
  sentiment: SentimentResult;
  decision: DecisionResult;
  draft: DraftResult;
  task: Awaited<ReturnType<typeof insertTask>>;
  steps: AgentStepLog[];
  startedAt: string;
  completedAt: string;
}

function extractCustomerQuery(slackMessage: string): string | null {
  const match = slackMessage.match(/(?:customer\s+)?([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*)\s+(?:is|has|reported|seems|looks)/i);
  return match ? match[1].trim() : null;
}

/**
 * The real 8-step agent workflow:
 * Slack event → customer history → sentiment → churn risk → LLM decides
 * action → explanation → follow-up task → draft message.
 * Every business judgment (risk, action, copy) comes from the LLM call —
 * nothing here is a hardcoded "complaint → discount → email" script.
 */
export async function runAgentWorkflow(params: {
  slackMessage: string;
  source: 'slack_event' | 'slash_command' | 'manual';
}): Promise<WorkflowRunResult> {
  const startedAt = new Date().toISOString();
  const steps: AgentStepLog[] = [];

  // 1. Receive Slack event (already have it) — identify the customer it's about.
  const query = extractCustomerQuery(params.slackMessage);
  const customer = (query ? await findCustomerByNameOrCompany(query) : null) ?? (await getMostValuableCustomer());
  if (!customer) throw new Error('No customers in the database yet — run server/schema.sql seed or add one via the API.');
  steps.push({ step: 1, name: 'Identify customer', detail: `Matched "${query ?? 'unspecified'}" → ${customer.company} (${customer.name})` });

  const run = await createWorkflowRun({ customer_id: customer.id, source: params.source, slack_message: params.slackMessage });

  // 2. Retrieve customer history (purchases, engagement, tickets) + memory of past decisions.
  const [purchaseHistory, engagementData, tickets, memory] = await Promise.all([
    getPurchaseHistory(customer.id),
    getEngagementHistory(customer.id),
    getRecentTickets(customer.id),
    getConversationMemory(customer.id),
  ]);
  steps.push({
    step: 2,
    name: 'Retrieve customer history',
    detail: `${purchaseHistory.length} purchases, ${engagementData.length} engagement snapshots, ${tickets.length} tickets, ${memory.length} past memory entries`,
  });

  // 3. Analyze sentiment of the triggering event.
  const sentiment = await generateJSON<SentimentResult>(
    SENTIMENT_SYSTEM,
    `Slack message: "${params.slackMessage}"`
  );
  steps.push({ step: 3, name: 'Analyze sentiment', detail: `${sentiment.sentiment} (confidence ${sentiment.confidence})` });

  const memoryText = memory.length
    ? memory.map((m) => `- [${m.role}] ${m.content}`).join('\n')
    : 'No prior history for this account.';

  // The "learning system": fold in how often humans have approved each
  // action type in the past so the LLM leans toward what's actually worked.
  const approvalStats = await getActionApprovalStats();
  const approvalText = approvalStats.length
    ? approvalStats.map((s) => `- "${s.action}": approved ${Math.round(s.approvalRate * 100)}% of the time (${s.approved} approved / ${s.rejected} rejected)`).join('\n')
    : 'No feedback history yet — no learned preferences to apply.';

  // 4-6. Predict churn risk, decide the best action, and explain it — one
  // reasoning call so the explanation is consistent with the decision.
  const decisionPrompt = `
CUSTOMER
name: ${customer.name}, company: ${customer.company}, tier: ${customer.tier}
value_score: ${customer.value_score}/100, annual_value: $${customer.annual_value}
active_subscriptions: ${customer.active_subscriptions}, customer_since: ${customer.joined_at}

PURCHASE HISTORY (${purchaseHistory.length} records)
${purchaseHistory.map((p) => `- ${p.date}: ${p.product} (${p.plan}) $${p.amount}`).join('\n') || 'none'}

ENGAGEMENT TREND (oldest → newest)
${engagementData.map((e) => `- ${e.date}: ${e.logins_per_week} logins/wk, feature usage ${e.feature_usage_score}/100, ${e.support_tickets} tickets, NPS ${e.nps_score ?? 'n/a'}`).join('\n') || 'none'}

RECENT SUPPORT TICKETS
${tickets.map((t) => `- ${t.created_at}: ${t.subject} (${t.sentiment ?? 'unknown'})`).join('\n') || 'none'}

MEMORY OF PAST DECISIONS FOR THIS ACCOUNT
${memoryText}

LEARNED PREFERENCES (human approval rate per action type, across all accounts)
${approvalText}

TRIGGERING SLACK EVENT
"${params.slackMessage}"  (detected sentiment: ${sentiment.sentiment}, confidence ${sentiment.confidence})
`.trim();

  const decision = await generateJSON<DecisionResult>(DECISION_SYSTEM, decisionPrompt);
  steps.push({
    step: 4,
    name: 'Predict churn risk',
    detail: `${(decision.churn_probability * 100).toFixed(0)}% churn probability → risk level: ${decision.risk_level}`,
  });
  steps.push({ step: 5, name: 'LLM decides best action', detail: `${decision.recommended_action} (confidence ${decision.confidence})` });
  steps.push({ step: 6, name: 'Business explanation', detail: decision.business_explanation });

  // 7. Create the follow-up task from the LLM's own recommendation.
  const dueAt = new Date(Date.now() + decision.task.due_in_hours * 3600 * 1000).toISOString();
  const task = await insertTask({
    customer_id: customer.id,
    workflow_run_id: run.id,
    title: decision.task.title,
    description: decision.task.description,
    priority: decision.task.priority,
    assignee: decision.task.assignee,
    due_at: dueAt,
  });
  steps.push({ step: 7, name: 'Create follow-up task', detail: `"${task.title}" → ${task.assignee}, due in ${decision.task.due_in_hours}h` });

  // 8. Draft the actual outbound message for the chosen action.
  const draft = await generateJSON<DraftResult>(
    DRAFT_MESSAGE_SYSTEM,
    `Customer: ${customer.name} at ${customer.company} (${customer.email}).\nRecommended action: ${decision.recommended_action}.\nWhy: ${decision.business_explanation}\nDiscount offer (if any): ${JSON.stringify(decision.discount)}`
  );
  steps.push({ step: 8, name: 'Draft message', detail: `${draft.channel} draft ready (${draft.tone} tone)` });

  const completedAt = new Date().toISOString();

  await updateWorkflowRun(run.id, {
    sentiment: sentiment.sentiment,
    sentiment_confidence: sentiment.confidence,
    churn_probability: decision.churn_probability,
    risk_level: decision.risk_level,
    recommended_action: decision.recommended_action,
    action_confidence: decision.confidence,
    business_explanation: decision.business_explanation,
    draft_message: draft.body,
    discount: decision.discount,
    task_id: task.id,
    status: 'completed',
    raw_llm_response: { sentiment, decision, draft },
    completed_at: completedAt,
  });

  // Persist to memory so the NEXT event about this customer has context.
  await appendMemory({ customer_id: customer.id, workflow_run_id: run.id, role: 'event', content: params.slackMessage });
  await appendMemory({
    customer_id: customer.id,
    workflow_run_id: run.id,
    role: 'agent_decision',
    content: `Decided "${decision.recommended_action}" (risk: ${decision.risk_level}, churn prob: ${decision.churn_probability}). ${decision.business_explanation}`,
  });

  return {
    id: run.id,
    slackMessage: params.slackMessage,
    customer,
    purchaseHistory,
    engagementData,
    tickets,
    sentiment,
    decision,
    draft,
    task,
    steps,
    startedAt,
    completedAt,
  };
}

/** Standalone helper used by the /api/agent/draft-followup style calls, e.g. from Slack interactive buttons. */
export async function draftFollowupOnly(customer: Customer, context: string): Promise<string> {
  return generateText(
    'You are a customer success rep drafting a brief, human follow-up message.',
    `Customer: ${customer.name} at ${customer.company}. Context: ${context}`
  );
}
