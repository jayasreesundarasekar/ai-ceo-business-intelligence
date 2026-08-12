const API_URL = import.meta.env.VITE_API_URL ?? 'https://ai-ceo-backend-1ouf.onrender.com';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface DashboardMetrics {
  mrr: number;
  customerCount: number;
  churnRate: number;
  avgLoginsPerWeek: number;
  highRiskAccounts: number;
  totalWorkflowRuns: number;
}

export interface Briefing {
  narrative: string;
  revenue_summary: string;
  risks: string[];
  opportunities: string[];
  recommended_actions: string[];
  agent_reports: Record<string, { summary: string; risks: string[]; opportunities: string[] }>;
  cached: boolean;
  date: string;
}

export interface TimelineEvent {
  timestamp: string;
  type: 'slack_message' | 'workflow_started' | 'workflow_completed' | 'task_created' | 'feedback';
  summary: string;
  customerId?: string | null;
}

export interface Forecast {
  next_month_revenue: number;
  revenue_confidence: number;
  revenue_reasoning: string;
  churn_forecast: string;
  churn_confidence: number;
  ticket_volume_forecast: string;
  cash_flow_risk: 'low' | 'medium' | 'high';
  cash_flow_reasoning: string;
}

export interface KnowledgeAnswer {
  answer: string;
  confidence: number;
  sources_used: number;
}

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

export interface HealthComponent {
  key: string;
  label: string;
  score: number;
  detail: string;
}

export interface HealthScore {
  score: number;
  components: HealthComponent[];
  narrative: string;
  top_driver: string;
  computed_at: string;
}

export interface MeetingAnalysis {
  summary: string;
  key_decisions: string[];
  action_items: Array<{ title: string; owner: string; priority: 'high' | 'medium' | 'low'; due_hint: string }>;
  unresolved_issues: string[];
  tasks_created: number;
}

export interface StrategyPlan {
  title: string;
  summary: string;
  initiatives: Array<{ title: string; description: string; expected_impact: string; timeline: string }>;
  risks: string[];
  success_metrics: string[];
  expected_roi: string;
  timeline: string;
}

export interface DebateResult {
  topic: string;
  sales: { position: string; argument: string };
  finance: { position: string; argument: string };
  support: { position: string; argument: string };
  ceo_decision: string;
  ceo_reasoning: string;
  ceo_confidence: number;
}

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
export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface WorkflowExplanation {
  id: string;
  recommended_action: string;
  business_explanation: string;
  confidence: number;
  risk_level: string;
  churn_probability: number;
  data_sources_consulted: string[];
  missing_information: string[];
  alternative_actions: string[];
  started_at: string;
  completed_at: string | null;
}

export interface IntegrationsStatus {
  jira: { configured: boolean };
  hubspot: { configured: boolean };
  google: { configured: boolean; connected: boolean; account: string | null; connectedAt: string | null };
}

export interface ImportProposalCustomer {
  company: string;
  contact_name: string;
  email: string | null;
  tier: 'enterprise' | 'pro' | 'starter';
  annual_value: number;
  value_score: number;
}
export interface ImportProposal {
  customers: ImportProposalCustomer[];
  purchases: Array<{ customer_company: string; product: string; amount: number; plan: 'monthly' | 'annual' }>;
  tickets: Array<{ customer_company: string; subject: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
  summary: string;
}
export interface FileExtractionResult {
  filename: string;
  charactersExtracted: number;
  error?: string;
}
export interface ImportCommitResult {
  customersCreated: number;
  customersMatched: number;
  purchasesCreated: number;
  ticketsCreated: number;
}

export interface EvaluationMetrics {
  decisionsMade: number;
  decisionsReviewed: number;
  decisionsAccepted: number;
  decisionsRejected: number;
  acceptanceRate: number;
  revenueProtected: number;
  avgResponseTimeSeconds: number;
  atRiskAccountsSeen: number;
  atRiskAccountsRetained: number;
  retentionRate: number;
  calibration: Array<{ bucket: string; avgConfidence: number; approvalRate: number; sampleSize: number }>;
  trend: Array<{ month: string; decisionsMade: number; accepted: number; revenueProtected: number }>;
}

export const api = {
  triggerWorkflow: (slackMessage: string) =>
    request<unknown>('/api/workflow/trigger', { method: 'POST', body: JSON.stringify({ slackMessage }) }),
  getMetrics: () => request<DashboardMetrics>('/api/dashboard/metrics'),
  getRevenue: () => request<Array<{ date: string; revenue: number }>>('/api/dashboard/revenue'),
  getChurn: () => request<Array<{ month: string; rate: number; atRisk: number }>>('/api/dashboard/churn'),
  getInsights: () => request<Array<Record<string, unknown>>>('/api/dashboard/insights'),
  getTasks: () => request<Array<Record<string, unknown>>>('/api/dashboard/tasks'),
  getCustomers: () => request<Array<Record<string, unknown>>>('/api/customers'),
  getSlackStatus: () => request<{ connected: boolean; workspace?: string; installedAt?: string }>('/api/slack/oauth/status'),
  getBriefing: () => request<Briefing>('/api/briefing/today'),
  getTimeline: () => request<TimelineEvent[]>('/api/timeline'),
  getForecast: () => request<Forecast>('/api/forecast'),
  askKnowledge: (question: string) => request<KnowledgeAnswer>('/api/knowledge/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  getEvaluation: () => request<EvaluationMetrics>('/api/evaluation'),
  runSimulation: (scenario: string) =>
    request<SimulationResult>('/api/simulator/run', { method: 'POST', body: JSON.stringify({ scenario }) }),
  getCrisisAlerts: () => request<CrisisAlert[]>('/api/crisis/alerts'),
  getHealthScore: () => request<HealthScore>('/api/health-score'),
  analyzeMeeting: (transcript: string, createTasks: boolean) =>
    request<MeetingAnalysis>('/api/meeting/analyze', { method: 'POST', body: JSON.stringify({ transcript, createTasks }) }),
  generateStrategy: (goal: string) =>
    request<StrategyPlan>('/api/strategy/plan', { method: 'POST', body: JSON.stringify({ goal }) }),
  runDebate: (topic: string) => request<DebateResult>('/api/debate/run', { method: 'POST', body: JSON.stringify({ topic }) }),
  getMemoryGraph: () => request<MemoryGraph>('/api/graph'),
  explainWorkflowRun: (id: string) => request<WorkflowExplanation>(`/api/workflow/${id}/explain`),
  getRecentRuns: () => request<Array<Record<string, unknown>>>('/api/workflow/recent'),
  parseDataImport: async (files: File[]): Promise<{ proposal: ImportProposal; fileResults: FileExtractionResult[] }> => {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    const res = await fetch(`${API_URL}/api/data-import/parse`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API /api/data-import/parse failed (${res.status}): ${body}`);
    }
    return res.json();
  },
  commitDataImport: (proposal: ImportProposal) =>
    request<ImportCommitResult>('/api/data-import/commit', { method: 'POST', body: JSON.stringify({ proposal }) }),
  submitFeedback: (workflowRunId: string, decision: 'approved' | 'rejected') =>
    request<unknown>(`/api/workflow/${workflowRunId}/feedback`, { method: 'POST', body: JSON.stringify({ decision }) }),
  getIntegrationsStatus: () => request<IntegrationsStatus>('/api/integrations/status'),
  googleConnectUrl: () => `${API_URL}/api/integrations/google/install`,
  createJiraTask: (workflowRunId: string) =>
    request<{ key: string; url: string }>('/api/integrations/jira/create-task', { method: 'POST', body: JSON.stringify({ workflowRunId }) }),
  sendViaGmail: (workflowRunId: string) =>
    request<{ id: string }>('/api/integrations/gmail/send', { method: 'POST', body: JSON.stringify({ workflowRunId }) }),
  scheduleFollowup: (workflowRunId: string) =>
    request<{ id: string; htmlLink: string }>('/api/integrations/calendar/schedule', { method: 'POST', body: JSON.stringify({ workflowRunId }) }),
  syncToHubspot: (workflowRunId: string) =>
    request<{ contactId: string; synced: boolean }>('/api/integrations/hubspot/sync', { method: 'POST', body: JSON.stringify({ workflowRunId }) }),
  weeklyReportPdfUrl: () => `${API_URL}/api/reports/weekly`,
};

export { API_URL };
