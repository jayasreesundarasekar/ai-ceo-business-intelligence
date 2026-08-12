import { supabase } from './supabase.js';

export interface Customer {
  id: string;
  name: string;
  company: string;
  tier: 'enterprise' | 'pro' | 'starter';
  value_score: number;
  annual_value: number;
  email: string;
  avatar: string | null;
  active_subscriptions: number;
  joined_at: string;
}

export async function findCustomerByNameOrCompany(query: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${query}%,company.ilike.%${query}%`)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getMostValuableCustomer(): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('annual_value', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getPurchaseHistory(customerId: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('customer_id', customerId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getEngagementHistory(customerId: string) {
  const { data, error } = await supabase
    .from('engagement_snapshots')
    .select('*')
    .eq('customer_id', customerId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRecentTickets(customerId: string, limit = 10) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Past decisions/events for this customer — this is the "memory" the agent
// reads before deciding, so it isn't treating every event as brand new.
export async function getConversationMemory(customerId: string, limit = 8) {
  const { data, error } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse(); // chronological order for the prompt
}

export async function appendMemory(entry: {
  customer_id: string;
  workflow_run_id?: string | null;
  role: 'event' | 'agent_decision' | 'note';
  content: string;
}) {
  const { error } = await supabase.from('conversation_memory').insert(entry);
  if (error) throw error;
}

export async function insertTask(task: {
  customer_id: string | null;
  workflow_run_id?: string | null;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  due_at: string;
}) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) throw error;
  return data;
}

export async function createWorkflowRun(run: {
  customer_id: string | null;
  source: string;
  slack_message: string;
}) {
  const { data, error } = await supabase.from('workflow_runs').insert(run).select().single();
  if (error) throw error;
  return data;
}

export async function updateWorkflowRun(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('workflow_runs').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getRecentWorkflowRuns(limit = 20) {
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('*, customers(*)')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAllTasks(limit = 50) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, customers(name, company)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ───────────── dashboard aggregates (real numbers, no static JSON) ─────────────

export async function getDashboardMetrics() {
  const { data: customers, error: custErr } = await supabase.from('customers').select('annual_value, tier');
  if (custErr) throw custErr;

  const mrr = (customers ?? []).reduce((sum, c) => sum + Number(c.annual_value) / 12, 0);

  const { count: totalRuns } = await supabase.from('workflow_runs').select('*', { count: 'exact', head: true });
  const { count: highRisk } = await supabase
    .from('workflow_runs')
    .select('*', { count: 'exact', head: true })
    .in('risk_level', ['high', 'critical']);

  const { data: engagement } = await supabase
    .from('engagement_snapshots')
    .select('logins_per_week, date')
    .order('date', { ascending: false })
    .limit(50);

  const avgLogins = engagement && engagement.length
    ? engagement.reduce((s, e) => s + Number(e.logins_per_week), 0) / engagement.length
    : 0;

  const churnRate = totalRuns && totalRuns > 0 ? ((highRisk ?? 0) / totalRuns) * 100 : 0;

  return {
    mrr: Math.round(mrr),
    customerCount: customers?.length ?? 0,
    churnRate: Number(churnRate.toFixed(1)),
    avgLoginsPerWeek: Number(avgLogins.toFixed(1)),
    highRiskAccounts: highRisk ?? 0,
    totalWorkflowRuns: totalRuns ?? 0,
  };
}

export async function getChurnRiskBreakdown() {
  const { data, error } = await supabase.from('workflow_runs').select('risk_level, started_at');
  if (error) throw error;
  const byMonth = new Map<string, { total: number; atRisk: number }>();
  for (const row of data ?? []) {
    const month = new Date(row.started_at).toLocaleString('en-US', { month: 'short' });
    const entry = byMonth.get(month) ?? { total: 0, atRisk: 0 };
    entry.total += 1;
    if (row.risk_level === 'high' || row.risk_level === 'critical') entry.atRisk += 1;
    byMonth.set(month, entry);
  }
  return Array.from(byMonth.entries()).map(([month, v]) => ({
    month,
    rate: v.total ? Number(((v.atRisk / v.total) * 100).toFixed(1)) : 0,
    atRisk: v.atRisk,
  }));
}

// ───────────── learning system: feedback on AI decisions ─────────────

export async function insertFeedback(entry: {
  workflow_run_id: string;
  customer_id: string | null;
  recommended_action: string;
  decision: 'approved' | 'rejected';
  source: 'slack' | 'dashboard';
  reviewer?: string;
}) {
  const { error } = await supabase.from('decision_feedback').insert(entry);
  if (error) throw error;
}

/** Approval rate per recommended action, used to bias future LLM decisions
 * toward what the business has actually accepted before. */
export async function recordDecisionFeedback(feedback: {
  workflow_run_id: string;
  customer_id: string | null;
  recommended_action: string;
  decision: 'approved' | 'rejected';
  source: 'slack' | 'dashboard';
  reviewer?: string;
}) {
  const { data, error } = await supabase.from('decision_feedback').insert(feedback).select().single();
  if (error) throw error;
  return data;
}

export async function getActionApprovalStats(): Promise<Array<{ action: string; approved: number; rejected: number; approvalRate: number }>> {
  const { data, error } = await supabase.from('decision_feedback').select('recommended_action, decision');
  if (error) throw error;
  const byAction = new Map<string, { approved: number; rejected: number }>();
  for (const row of data ?? []) {
    const entry = byAction.get(row.recommended_action) ?? { approved: 0, rejected: 0 };
    if (row.decision === 'approved') entry.approved += 1;
    else entry.rejected += 1;
    byAction.set(row.recommended_action, entry);
  }
  return Array.from(byAction.entries()).map(([action, v]) => ({
    action,
    approved: v.approved,
    rejected: v.rejected,
    approvalRate: v.approved + v.rejected ? Number((v.approved / (v.approved + v.rejected)).toFixed(2)) : 0.5,
  }));
}

// ───────────── business timeline: merged feed of everything that happened ─────────────

export interface TimelineEvent {
  timestamp: string;
  type: 'slack_message' | 'workflow_started' | 'workflow_completed' | 'task_created' | 'feedback';
  summary: string;
  customerId?: string | null;
}

export async function getBusinessTimeline(limit = 40): Promise<TimelineEvent[]> {
  const [{ data: messages }, { data: runs }, { data: tasks }, { data: feedback }] = await Promise.all([
    supabase.from('slack_messages').select('created_at, channel, text').order('created_at', { ascending: false }).limit(limit),
    supabase.from('workflow_runs').select('id, customer_id, started_at, completed_at, status, risk_level, recommended_action, customers(company)').order('started_at', { ascending: false }).limit(limit),
    supabase.from('tasks').select('created_at, title, customer_id').order('created_at', { ascending: false }).limit(limit),
    supabase.from('decision_feedback').select('created_at, recommended_action, decision, customer_id').order('created_at', { ascending: false }).limit(limit),
  ]);

  const events: TimelineEvent[] = [];
  for (const m of messages ?? []) {
    events.push({ timestamp: m.created_at, type: 'slack_message', summary: `#${m.channel}: "${m.text}"` });
  }
  for (const r of runs ?? []) {
    const company = (r as { customers?: { company?: string } }).customers?.company ?? 'an account';
    events.push({ timestamp: r.started_at, type: 'workflow_started', summary: `Agent started analyzing ${company}`, customerId: r.customer_id });
    if (r.completed_at) {
      events.push({
        timestamp: r.completed_at,
        type: 'workflow_completed',
        summary: `Agent recommended "${r.recommended_action}" for ${company} (${r.risk_level} risk)`,
        customerId: r.customer_id,
      });
    }
  }
  for (const t of tasks ?? []) {
    events.push({ timestamp: t.created_at, type: 'task_created', summary: `Task created: "${t.title}"`, customerId: t.customer_id });
  }
  for (const f of feedback ?? []) {
    events.push({ timestamp: f.created_at, type: 'feedback', summary: `Action "${f.recommended_action}" was ${f.decision}`, customerId: f.customer_id });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

// ───────────── business knowledge base: keyword search across raw sources ─────────────

export async function searchAcrossSources(query: string, limit = 8) {
  const like = `%${query}%`;
  const [{ data: tickets }, { data: messages }, { data: runs }, { data: memory }] = await Promise.all([
    supabase.from('tickets').select('subject, body, created_at, customers(company)').or(`subject.ilike.${like},body.ilike.${like}`).limit(limit),
    supabase.from('slack_messages').select('text, channel, created_at').ilike('text', like).limit(limit),
    supabase.from('workflow_runs').select('business_explanation, recommended_action, started_at, customers(company)').ilike('business_explanation', like).limit(limit),
    supabase.from('conversation_memory').select('content, role, created_at, customers(company)').ilike('content', like).limit(limit),
  ]);
  return { tickets: tickets ?? [], messages: messages ?? [], runs: runs ?? [], memory: memory ?? [] };
}

// ───────────── data for forecasting ─────────────

export async function getMonthlyRevenueHistory() {
  const { data, error } = await supabase.from('purchases').select('date, amount').order('date', { ascending: true });
  if (error) throw error;
  const byMonth = new Map<string, number>();
  for (const p of data ?? []) {
    const month = new Date(p.date).toLocaleString('en-US', { month: 'short', year: '2-digit' });
    byMonth.set(month, (byMonth.get(month) ?? 0) + Number(p.amount));
  }
  return Array.from(byMonth.entries()).map(([month, revenue]) => ({ month, revenue }));
}

// ───────────── evaluation: how well the AI is actually performing ─────────────
// This is the system measuring itself: not "what did the agent recommend"
// but "were those recommendations any good, were they fast, and were they
// trusted enough to be approved." Built entirely from workflow_runs +
// decision_feedback — no separate tracking table needed.

export interface EvaluationMetrics {
  decisionsMade: number;
  decisionsReviewed: number;
  decisionsAccepted: number;
  decisionsRejected: number;
  acceptanceRate: number; // 0–100
  revenueProtected: number;
  avgResponseTimeSeconds: number;
  atRiskAccountsSeen: number;
  atRiskAccountsRetained: number;
  retentionRate: number; // 0–100
  calibration: Array<{ bucket: string; avgConfidence: number; approvalRate: number; sampleSize: number }>;
  trend: Array<{ month: string; decisionsMade: number; accepted: number; revenueProtected: number }>;
}

export async function getEvaluationMetrics(): Promise<EvaluationMetrics> {
  const [{ data: runsData, error: runsErr }, { data: feedbackData, error: fbErr }] = await Promise.all([
    supabase
      .from('workflow_runs')
      .select('id, status, risk_level, action_confidence, started_at, completed_at, customers(annual_value)'),
    supabase.from('decision_feedback').select('workflow_run_id, decision'),
  ]);
  if (runsErr) throw runsErr;
  if (fbErr) throw fbErr;

  type Run = {
    id: string;
    status: string;
    risk_level: string | null;
    action_confidence: number | null;
    started_at: string;
    completed_at: string | null;
    customers?: { annual_value?: number } | { annual_value?: number }[] | null;
  };

  const annualValueOf = (r: Run): number => {
    const c = r.customers;
    if (!c) return 0;
    const row = Array.isArray(c) ? c[0] : c;
    return Number(row?.annual_value ?? 0);
  };

  const runs = (runsData ?? []) as Run[];
  const feedback = (feedbackData ?? []) as Array<{ workflow_run_id: string | null; decision: 'approved' | 'rejected' }>;

  const feedbackByRun = new Map<string, 'approved' | 'rejected'>();
  for (const f of feedback) {
    if (f.workflow_run_id) feedbackByRun.set(f.workflow_run_id, f.decision);
  }

  const completedRuns = runs.filter((r) => r.status === 'completed');
  const decisionsMade = completedRuns.length;

  const decisionsReviewed = feedback.length;
  const decisionsAccepted = feedback.filter((f) => f.decision === 'approved').length;
  const decisionsRejected = decisionsReviewed - decisionsAccepted;
  const acceptanceRate = decisionsReviewed ? Number(((decisionsAccepted / decisionsReviewed) * 100).toFixed(1)) : 0;

  // Revenue protected: annual value of at-risk (high/critical churn risk) accounts
  // whose recommended retention action was reviewed and approved.
  let revenueProtected = 0;
  let atRiskAccountsSeen = 0;
  let atRiskAccountsRetained = 0;
  for (const r of completedRuns) {
    const isAtRisk = r.risk_level === 'high' || r.risk_level === 'critical';
    if (!isAtRisk) continue;
    atRiskAccountsSeen += 1;
    if (feedbackByRun.get(r.id) === 'approved') {
      atRiskAccountsRetained += 1;
      revenueProtected += annualValueOf(r);
    }
  }
  const retentionRate = atRiskAccountsSeen ? Number(((atRiskAccountsRetained / atRiskAccountsSeen) * 100).toFixed(1)) : 100;

  // Average end-to-end response time (Slack event received → workflow completed).
  const durations = completedRuns
    .filter((r) => r.completed_at)
    .map((r) => (new Date(r.completed_at as string).getTime() - new Date(r.started_at).getTime()) / 1000);
  const avgResponseTimeSeconds = durations.length
    ? Number((durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1))
    : 0;

  // Confidence calibration: does a higher stated confidence actually correspond
  // to a higher real-world approval rate? Bucketed so it's easy to eyeball.
  const buckets = [
    { bucket: '0–59%', min: 0, max: 0.6 },
    { bucket: '60–79%', min: 0.6, max: 0.8 },
    { bucket: '80–100%', min: 0.8, max: 1.01 },
  ];
  const calibration = buckets.map(({ bucket, min, max }) => {
    const inBucket = completedRuns.filter(
      (r) => r.action_confidence != null && r.action_confidence >= min && r.action_confidence < max && feedbackByRun.has(r.id)
    );
    const approved = inBucket.filter((r) => feedbackByRun.get(r.id) === 'approved').length;
    const avgConfidence = inBucket.length
      ? Number(((inBucket.reduce((s, r) => s + Number(r.action_confidence), 0) / inBucket.length) * 100).toFixed(1))
      : Number((((min + Math.min(max, 1)) / 2) * 100).toFixed(1));
    return {
      bucket,
      avgConfidence,
      approvalRate: inBucket.length ? Number(((approved / inBucket.length) * 100).toFixed(1)) : 0,
      sampleSize: inBucket.length,
    };
  });

  // Month-over-month trend, so the eval page can show whether the AI is
  // improving rather than just a single snapshot.
  const trendMap = new Map<string, { decisionsMade: number; accepted: number; revenueProtected: number }>();
  for (const r of completedRuns) {
    const month = new Date(r.started_at).toLocaleString('en-US', { month: 'short' });
    const entry = trendMap.get(month) ?? { decisionsMade: 0, accepted: 0, revenueProtected: 0 };
    entry.decisionsMade += 1;
    const decision = feedbackByRun.get(r.id);
    if (decision === 'approved') {
      entry.accepted += 1;
      if (r.risk_level === 'high' || r.risk_level === 'critical') entry.revenueProtected += annualValueOf(r);
    }
    trendMap.set(month, entry);
  }
  const trend = Array.from(trendMap.entries()).map(([month, v]) => ({
    month,
    decisionsMade: v.decisionsMade,
    accepted: v.accepted,
    revenueProtected: Math.round(v.revenueProtected),
  }));

  return {
    decisionsMade,
    decisionsReviewed,
    decisionsAccepted,
    decisionsRejected,
    acceptanceRate,
    revenueProtected: Math.round(revenueProtected),
    avgResponseTimeSeconds,
    atRiskAccountsSeen,
    atRiskAccountsRetained,
    retentionRate,
    calibration,
    trend,
  };
}

// ───────────── explainable AI: full "why" trail for one decision ─────────────

export async function getWorkflowRunById(id: string) {
  const { data, error } = await supabase.from('workflow_runs').select('*, customers(name, company, email)').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ───────────── business memory graph: customers/decisions/tasks/tickets as nodes+edges ─────────────

export interface GraphNode {
  id: string;
  label: string;
  type: 'customer' | 'decision' | 'task' | 'ticket';
  detail?: string;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export async function getMemoryGraph(limit = 25): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [{ data: customers }, { data: runs }, { data: tasks }, { data: tickets }] = await Promise.all([
    supabase.from('customers').select('id, name, company, tier').limit(limit),
    supabase.from('workflow_runs').select('id, customer_id, recommended_action, risk_level, status').eq('status', 'completed').order('started_at', { ascending: false }).limit(limit),
    supabase.from('tasks').select('id, customer_id, title, status').order('created_at', { ascending: false }).limit(limit),
    supabase.from('tickets').select('id, customer_id, subject, sentiment').order('created_at', { ascending: false }).limit(limit),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const customerIds = new Set((customers ?? []).map((c) => c.id));

  for (const c of customers ?? []) {
    nodes.push({ id: `customer:${c.id}`, label: c.company, type: 'customer', detail: `${c.name} · ${c.tier}` });
  }
  for (const r of runs ?? []) {
    if (!r.customer_id || !customerIds.has(r.customer_id)) continue;
    nodes.push({ id: `decision:${r.id}`, label: r.recommended_action ?? 'decision', type: 'decision', detail: r.risk_level ?? undefined });
    edges.push({ source: `customer:${r.customer_id}`, target: `decision:${r.id}`, type: 'decided' });
  }
  for (const t of tasks ?? []) {
    if (!t.customer_id || !customerIds.has(t.customer_id)) continue;
    nodes.push({ id: `task:${t.id}`, label: t.title, type: 'task', detail: t.status });
    edges.push({ source: `customer:${t.customer_id}`, target: `task:${t.id}`, type: 'follow-up' });
  }
  for (const tk of tickets ?? []) {
    if (!tk.customer_id || !customerIds.has(tk.customer_id)) continue;
    nodes.push({ id: `ticket:${tk.id}`, label: tk.subject, type: 'ticket', detail: tk.sentiment ?? undefined });
    edges.push({ source: `customer:${tk.customer_id}`, target: `ticket:${tk.id}`, type: 'raised' });
  }

  return { nodes, edges };
}

// ───────────── data import: commit an LLM-structured proposal to real tables ─────────────

export interface ImportCommitResult {
  customersCreated: number;
  customersMatched: number;
  purchasesCreated: number;
  ticketsCreated: number;
}

export async function commitImportProposal(proposal: {
  customers: Array<{ company: string; contact_name: string; email: string | null; tier: 'enterprise' | 'pro' | 'starter'; annual_value: number; value_score: number }>;
  purchases: Array<{ customer_company: string; product: string; amount: number; plan: 'monthly' | 'annual' }>;
  tickets: Array<{ customer_company: string; subject: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
}): Promise<ImportCommitResult> {
  const companyToId = new Map<string, string>();
  let customersCreated = 0;
  let customersMatched = 0;

  for (const c of proposal.customers) {
    // Match an existing customer by company name (case-insensitive) rather than
    // creating duplicates if the same company appears across multiple uploads
    // or was already seeded.
    const { data: existing } = await supabase.from('customers').select('id').ilike('company', c.company).limit(1).maybeSingle();
    if (existing) {
      companyToId.set(c.company, existing.id);
      customersMatched++;
      continue;
    }
    const { data: created, error } = await supabase
      .from('customers')
      .insert({
        name: c.contact_name || 'Unknown Contact',
        company: c.company,
        tier: c.tier,
        value_score: Math.max(0, Math.min(100, Math.round(c.value_score))),
        annual_value: Math.max(0, Math.round(c.annual_value)),
        email: c.email,
        active_subscriptions: 1,
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;
    companyToId.set(c.company, created.id);
    customersCreated++;
  }

  let purchasesCreated = 0;
  for (const p of proposal.purchases) {
    const customerId = companyToId.get(p.customer_company);
    if (!customerId) continue; // skip purchases whose customer wasn't in the proposal (shouldn't normally happen)
    const { error } = await supabase.from('purchases').insert({
      customer_id: customerId,
      date: new Date().toISOString(),
      product: p.product,
      amount: Math.max(0, Math.round(p.amount)),
      plan: p.plan,
    });
    if (error) throw error;
    purchasesCreated++;
  }

  let ticketsCreated = 0;
  for (const t of proposal.tickets) {
    const customerId = companyToId.get(t.customer_company);
    if (!customerId) continue;
    const { error } = await supabase.from('tickets').insert({
      customer_id: customerId,
      subject: t.subject,
      body: t.subject,
      sentiment: t.sentiment,
      status: 'open',
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    ticketsCreated++;
  }

  return { customersCreated, customersMatched, purchasesCreated, ticketsCreated };
}

export async function getTicketVolumeTrend() {
  const { data, error } = await supabase.from('tickets').select('created_at');
  if (error) throw error;
  const byMonth = new Map<string, number>();
  for (const t of data ?? []) {
    const month = new Date(t.created_at).toLocaleString('en-US', { month: 'short' });
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  return Array.from(byMonth.entries()).map(([month, count]) => ({ month, count }));
}
