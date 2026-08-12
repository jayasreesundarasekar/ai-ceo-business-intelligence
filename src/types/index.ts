export interface MetricCard {
  id: string;
  title: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  trend: number;
  trendDirection: 'up' | 'down' | 'flat';
  sentiment: 'positive' | 'negative' | 'neutral';
  comparisonLabel: string;
  icon: 'dollar' | 'users' | 'activity' | 'clock' | 'trending-up' | 'trending-down';
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  predicted?: number;
}

export interface ChurnDataPoint {
  month: string;
  rate: number;
  predicted?: number;
  atRisk: number;
}

export interface Insight {
  id: string;
  category: 'revenue' | 'churn' | 'operations' | 'bottleneck';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  metric?: string;
  timestamp: string;
  read: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  connected: boolean;
}

export interface WeeklyReport {
  id: string;
  weekEnding: string;
  summary: string;
  highlights: string[];
  metrics: {
    revenueChange: number;
    churnRate: number;
    activeUsers: number;
    supportTickets: number;
  };
  topInsight: string;
  aiGenerated: boolean;
}

export interface SlackConnection {
  status: 'connected' | 'disconnected' | 'pending';
  workspaceName?: string;
  channels: SlackChannel[];
  alertsEnabled: boolean;
  reportChannel?: string;
  autoActions: boolean;
}

/* ───── AI CEO Workflow Types ───── */

export interface Customer {
  id: string;
  name: string;
  company: string;
  tier: 'enterprise' | 'pro' | 'starter';
  valueScore: number; // 0–100
  annualValue: number;
  joinedAt: string;
  email: string;
  avatar?: string;
  activeSubscriptions: number;
}

export interface PurchaseRecord {
  id: string;
  customerId: string;
  date: string;
  product: string;
  amount: number;
  plan: string;
}

export interface EngagementSnapshot {
  date: string;
  customerId: string;
  loginsPerWeek: number;
  featureUsageScore: number; // 0–100
  supportTickets: number;
  npsScore?: number;
  lastActive: string;
}

export type ReasoningCategory =
  | 'customer-identification'
  | 'purchase-history'
  | 'engagement-analysis'
  | 'email-drafting'
  | 'discount-suggestion'
  | 'task-creation'
  | 'dashboard-update';

export interface AIReasoningStep {
  id: string;
  stepNumber: number;
  category: ReasoningCategory;
  title: string;
  reasoning: string;
  conclusion: string;
  icon: string;
  status: 'pending' | 'running' | 'completed';
}

export interface RetentionEmail {
  subject: string;
  body: string;
  tone: 'empathetic' | 'professional' | 'urgent';
  personalizationTokens: string[];
}

export interface DiscountOffer {
  type: 'percentage' | 'fixed' | 'extended_trial';
  value: number;
  description: string;
  reason: string;
  expiresInDays: number;
}

export interface FollowUpTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  dueInHours: number;
  status: 'open' | 'in_progress' | 'done';
  createdAt: string;
}

export interface WorkflowResult {
  id: string;
  slackMessage: string;
  customer: Customer;
  purchaseHistory: PurchaseRecord[];
  engagementData: EngagementSnapshot[];
  steps: AIReasoningStep[];
  email: RetentionEmail;
  discount: DiscountOffer;
  task: FollowUpTask;
  dashboardInsight: Insight;
  status: 'idle' | 'processing' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowContextType {
  workflow: WorkflowResult | null;
  isProcessing: boolean;
  triggerWorkflow: (slackMessage: string) => void;
  resetWorkflow: () => void;
  workflows: WorkflowResult[];
}
