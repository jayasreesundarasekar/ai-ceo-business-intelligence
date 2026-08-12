// This file used to contain the entire hardcoded "Complaint → Discount →
// Email" script. It now just calls the real backend, which runs the
// message through Groq and Supabase (see server/src/agent/pipeline.ts),
// and adapts the response into the shapes the existing UI components
// (ReasoningTimeline, EmailPreview, DiscountCard, TaskCard) already expect.
import type {
  WorkflowResult,
  AIReasoningStep,
  RetentionEmail,
  DiscountOffer,
  FollowUpTask,
  Insight,
  Customer,
  PurchaseRecord,
  EngagementSnapshot,
} from '../types';
import { API_URL } from './api';

interface BackendStep {
  step: number;
  name: string;
  detail: string;
}

// Shapes below mirror the backend's raw Supabase rows (snake_case) — these
// are intentionally distinct from the frontend's camelCase types in
// ../types. The to*() functions below convert between the two.
interface BackendCustomer {
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

interface BackendPurchase {
  id: string;
  customer_id: string;
  date: string;
  product: string;
  amount: number;
  plan: string;
}

interface BackendEngagementSnapshot {
  id: string;
  customer_id: string;
  date: string;
  logins_per_week: number;
  feature_usage_score: number;
  support_tickets: number;
  nps_score: number | null;
  last_active: string;
}

interface BackendWorkflowResult {
  id: string;
  slackMessage: string;
  customer: BackendCustomer;
  purchaseHistory: BackendPurchase[];
  engagementData: BackendEngagementSnapshot[];
  sentiment: { sentiment: 'positive' | 'neutral' | 'negative'; confidence: number; reason: string };
  decision: {
    churn_probability: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    recommended_action: string;
    confidence: number;
    business_explanation: string;
    discount: { type: string; value: number; reason: string } | null;
    task: { title: string; description: string; priority: 'high' | 'medium' | 'low'; assignee: string; due_in_hours: number };
  };
  draft: { channel: 'email' | 'slack'; subject: string | null; body: string; tone: string };
  task: { id: string; title: string; description: string; priority: 'high' | 'medium' | 'low'; assignee: string; due_at: string; status: string; created_at: string };
  steps: BackendStep[];
  startedAt: string;
  completedAt: string;
}

const ICONS = ['Search', 'Receipt', 'Activity', 'Percent', 'Mail', 'CheckSquare', 'BarChart3'] as const;

function toCustomer(c: BackendCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    tier: c.tier,
    valueScore: c.value_score,
    annualValue: c.annual_value,
    joinedAt: c.joined_at,
    email: c.email,
    avatar: c.avatar ?? undefined,
    activeSubscriptions: c.active_subscriptions,
  };
}

function toPurchaseHistory(purchases: BackendPurchase[]): PurchaseRecord[] {
  return purchases.map((p) => ({
    id: p.id,
    customerId: p.customer_id,
    date: p.date,
    product: p.product,
    amount: p.amount,
    plan: p.plan,
  }));
}

function toEngagementData(snapshots: BackendEngagementSnapshot[]): EngagementSnapshot[] {
  return snapshots.map((e) => ({
    date: e.date,
    customerId: e.customer_id,
    loginsPerWeek: e.logins_per_week,
    featureUsageScore: e.feature_usage_score,
    supportTickets: e.support_tickets,
    npsScore: e.nps_score ?? undefined,
    lastActive: e.last_active,
  }));
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function toReasoningSteps(r: BackendWorkflowResult): AIReasoningStep[] {
  const byNum = (n: number) => r.steps.find((s) => s.step === n)?.detail ?? '';
  const entries: Array<{ category: AIReasoningStep['category']; title: string; icon: (typeof ICONS)[number]; reasoning: string; conclusion: string }> = [
    { category: 'customer-identification', title: 'Identify Customer', icon: 'Search', reasoning: byNum(1), conclusion: `${r.customer.company} identified — ${r.customer.tier} tier, ${formatCurrency(r.customer.annual_value)}/yr.` },
    { category: 'purchase-history', title: 'Retrieve Customer History', icon: 'Receipt', reasoning: byNum(2), conclusion: `${r.purchaseHistory.length} purchases and ${r.engagementData.length} engagement snapshots loaded from the database.` },
    { category: 'engagement-analysis', title: 'Sentiment & Churn Risk', icon: 'Activity', reasoning: `${byNum(3)}\n${byNum(4)}`, conclusion: `Risk level: ${r.decision.risk_level.toUpperCase()} (${Math.round(r.decision.churn_probability * 100)}% churn probability).` },
    { category: 'discount-suggestion', title: 'LLM Decides Best Action', icon: 'Percent', reasoning: `${byNum(5)}\n${byNum(6)}`, conclusion: `Recommended action: ${r.decision.recommended_action} (confidence ${Math.round(r.decision.confidence * 100)}%).` },
    { category: 'email-drafting', title: 'Draft Follow-up Message', icon: 'Mail', reasoning: byNum(8), conclusion: `${r.draft.channel === 'email' ? 'Email' : 'Slack message'} drafted in a ${r.draft.tone} tone.` },
    { category: 'task-creation', title: 'Create Follow-up Task', icon: 'CheckSquare', reasoning: byNum(7), conclusion: `Task assigned to ${r.task.assignee}.` },
    { category: 'dashboard-update', title: 'Update Dashboard', icon: 'BarChart3', reasoning: `Workflow run ${r.id} logged to the executive dashboard and customer memory.`, conclusion: `${r.customer.company} now reflected as ${r.decision.risk_level} risk across the dashboard.` },
  ];
  return entries.map((e, i) => ({
    id: `step-${i + 1}`,
    stepNumber: i + 1,
    category: e.category,
    title: e.title,
    icon: e.icon,
    reasoning: e.reasoning,
    conclusion: e.conclusion,
    status: 'completed',
  }));
}

function toEmail(r: BackendWorkflowResult): RetentionEmail {
  const t = r.draft.tone?.toLowerCase() ?? '';
  const tone: RetentionEmail['tone'] = t.includes('urgent') ? 'urgent' : t.includes('empath') ? 'empathetic' : 'professional';
  return {
    subject: r.draft.subject ?? `An update on your account, ${r.customer.name}`,
    body: r.draft.body,
    tone,
    personalizationTokens: [r.customer.name, r.customer.company],
  };
}

function toDiscount(r: BackendWorkflowResult): DiscountOffer {
  const d = r.decision.discount;
  if (!d || d.type === 'none') {
    return { type: 'percentage', value: 0, description: 'No discount recommended for this account right now.', reason: r.decision.business_explanation, expiresInDays: 0 };
  }
  return {
    type: (d.type as DiscountOffer['type']) ?? 'percentage',
    value: d.value,
    description: d.reason,
    reason: d.reason,
    expiresInDays: 14,
  };
}

function toTask(r: BackendWorkflowResult): FollowUpTask {
  return {
    id: r.task.id,
    title: r.task.title,
    description: r.task.description,
    priority: r.task.priority,
    assignee: r.task.assignee,
    dueInHours: r.decision.task.due_in_hours,
    status: 'open',
    createdAt: r.task.created_at,
  };
}

function toInsight(r: BackendWorkflowResult): Insight {
  const severity: Insight['severity'] = r.decision.risk_level === 'critical' ? 'critical' : r.decision.risk_level === 'high' ? 'warning' : 'info';
  return {
    id: `ins-${r.id}`,
    category: 'churn',
    severity,
    title: `${r.decision.recommended_action}: ${r.customer.company}`,
    description: r.decision.business_explanation,
    action: r.decision.recommended_action,
    metric: `${Math.round(r.decision.churn_probability * 100)}% churn probability`,
    timestamp: r.completedAt,
    read: false,
  };
}

export async function runWorkflow(slackMessage: string): Promise<WorkflowResult> {
  const res = await fetch(`${API_URL}/api/workflow/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slackMessage }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Workflow run failed (${res.status}): ${body}. Is the backend running (server/README.md) with GROQ_API_KEY + Supabase configured?`);
  }
  const r = (await res.json()) as BackendWorkflowResult;

  return {
    id: r.id,
    slackMessage: r.slackMessage,
    customer: toCustomer(r.customer),
    purchaseHistory: toPurchaseHistory(r.purchaseHistory),
    engagementData: toEngagementData(r.engagementData),
    steps: toReasoningSteps(r),
    email: toEmail(r),
    discount: toDiscount(r),
    task: toTask(r),
    dashboardInsight: toInsight(r),
    status: 'completed',
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  };
}
