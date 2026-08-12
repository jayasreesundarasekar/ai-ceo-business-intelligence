// Realistic SaaS seed data for local/demo use. Run with `npm run db:setup`
// from server/. Populates customers, purchases, engagement snapshots,
// tickets, tasks, a batch of historical workflow_runs (so Timeline/
// Evaluation/Command Center/Memory Graph have real data to show), decision
// feedback (approve/reject history for the calibration + acceptance-rate
// metrics), and conversation memory. Idempotent-ish: if customers already
// exist, it exits without duplicating data — drop the tables (or their
// rows) first if you want a fresh seed.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ───────────── realistic SaaS company/people roster ─────────────

const COMPANIES: Array<{ name: string; contact: string; tier: 'enterprise' | 'pro' | 'starter' }> = [
  { name: 'GlobalTech Solutions', contact: 'Marcus Webb', tier: 'enterprise' },
  { name: 'Nimbus Retail', contact: 'Priya Anand', tier: 'enterprise' },
  { name: 'Meridian Labs', contact: 'Jonah Ferreira', tier: 'enterprise' },
  { name: 'XYZ Corp', contact: 'Sarah Chen', tier: 'enterprise' },
  { name: 'Bright Path Media', contact: 'Devon Ellis', tier: 'pro' },
  { name: 'Cobalt Analytics', contact: 'Layla Haddad', tier: 'pro' },
  { name: 'Fernbank Studio', contact: 'Owen McCrae', tier: 'pro' },
  { name: 'Harborline Logistics', contact: 'Nadia Torres', tier: 'pro' },
  { name: 'Ridgeview Health', contact: 'Sam Whitfield', tier: 'pro' },
  { name: 'Petal & Vine', contact: 'Ruth Okafor', tier: 'starter' },
  { name: 'Northstack Dev', contact: 'Kenji Watanabe', tier: 'starter' },
  { name: 'Two Rivers Coffee', contact: 'Alicia Marsh', tier: 'starter' },
  { name: 'Fold Studio', contact: 'Theo Grant', tier: 'starter' },
  { name: 'Vantage Point Consulting', contact: 'Emily Ross', tier: 'pro' },
];

const TIER_ANNUAL_VALUE: Record<string, [number, number]> = {
  enterprise: [42000, 95000],
  pro: [9000, 24000],
  starter: [1200, 4800],
};

const PRODUCTS = ['Core Platform', 'Analytics Add-on', 'Team Seats', 'Priority Support', 'API Access'];
const PLANS = ['monthly', 'annual'];

const TICKET_SUBJECTS: Array<{ subject: string; sentiment: 'positive' | 'neutral' | 'negative' }> = [
  { subject: 'Billing UI is confusing after the redesign', sentiment: 'negative' },
  { subject: 'Cannot export reports to CSV', sentiment: 'negative' },
  { subject: 'Feature request: bulk user import', sentiment: 'neutral' },
  { subject: 'Loving the new dashboard, great work', sentiment: 'positive' },
  { subject: 'API rate limits too low for our usage', sentiment: 'negative' },
  { subject: 'Question about SSO setup', sentiment: 'neutral' },
  { subject: 'Onboarding call was excellent, thank you', sentiment: 'positive' },
  { subject: 'Third outage this month, getting frustrated', sentiment: 'negative' },
  { subject: 'Can we get a demo of the enterprise tier?', sentiment: 'positive' },
  { subject: 'Invoice mismatch for last quarter', sentiment: 'negative' },
];

const SLACK_TRIGGERS = [
  (c: string) => `${c} is unhappy and mentioned looking at competitors. Can we do something?`,
  (c: string) => `${c} just sent a termination notice. Losing them would hurt.`,
  (c: string) => `Support flagged multiple angry tickets from ${c} in the last day.`,
  (c: string) => `${c} has been hitting usage limits for weeks and keeps asking about upgrading.`,
  (c: string) => `Finance at ${c} is asking about renewal terms — sounds like they want a deal.`,
  (c: string) => `${c}'s champion just left the company, we're worried about the renewal.`,
];

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const ACTIONS = [
  'Offer a retention discount and schedule an executive check-in',
  'Escalate to Customer Success lead for a same-week call',
  'Send a personalized win-back offer with expanded support',
  'No discount — send a proactive check-in email',
  'Propose an annual pre-pay discount to lock in the renewal',
];

async function alreadySeeded(): Promise<boolean> {
  const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  return (count ?? 0) > 3; // more than the one row already in schema.sql
}

async function main() {
  if (await alreadySeeded()) {
    console.log('Customers table already has data beyond the schema.sql seed row — skipping to avoid duplicates.');
    console.log('If you want a fresh seed, clear the tables in Supabase first.');
    return;
  }

  console.log(`Seeding ${COMPANIES.length} realistic SaaS customers...`);

  const customerRows = COMPANIES.map((c) => {
    const [lo, hi] = TIER_ANNUAL_VALUE[c.tier];
    const [first, ...rest] = c.contact.split(' ');
    return {
      name: c.contact,
      company: c.name,
      tier: c.tier,
      value_score: randInt(35, 96),
      annual_value: randInt(lo, hi),
      email: `${first.toLowerCase()}.${(rest.join('') || 'contact').toLowerCase()}@${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      active_subscriptions: randInt(1, 5),
      joined_at: daysAgo(randInt(60, 900)),
    };
  });

  const { data: customers, error: custErr } = await supabase.from('customers').insert(customerRows).select();
  if (custErr) throw custErr;
  console.log(`  ${customers.length} customers created.`);

  // ───────────── purchases + engagement snapshots ─────────────
  const purchases = [];
  const engagement = [];
  const tickets = [];
  for (const cust of customers) {
    const purchaseCount = randInt(1, 3);
    for (let i = 0; i < purchaseCount; i++) {
      purchases.push({
        customer_id: cust.id,
        date: daysAgo(randInt(10, 700)),
        product: pick(PRODUCTS),
        amount: randInt(500, 12000),
        plan: pick(PLANS),
      });
    }

    const snapshotCount = randInt(3, 6);
    for (let i = 0; i < snapshotCount; i++) {
      engagement.push({
        customer_id: cust.id,
        date: daysAgo(i * 14),
        logins_per_week: Number((Math.random() * 12).toFixed(1)),
        feature_usage_score: randInt(10, 100),
        support_tickets: randInt(0, 4),
        nps_score: Math.random() > 0.3 ? randInt(-20, 100) : null,
        last_active: daysAgo(randInt(0, 20)),
      });
    }

    const ticketCount = randInt(0, 3);
    for (let i = 0; i < ticketCount; i++) {
      const t = pick(TICKET_SUBJECTS);
      tickets.push({
        customer_id: cust.id,
        subject: t.subject,
        body: `${cust.name} from ${cust.company} wrote in: ${t.subject.toLowerCase()}.`,
        sentiment: t.sentiment,
        status: pick(['open', 'in_progress', 'closed']),
        created_at: daysAgo(randInt(0, 14)),
      });
    }
  }

  if (purchases.length) await supabase.from('purchases').insert(purchases).throwOnError();
  if (engagement.length) await supabase.from('engagement_snapshots').insert(engagement).throwOnError();
  if (tickets.length) await supabase.from('tickets').insert(tickets).throwOnError();
  console.log(`  ${purchases.length} purchases, ${engagement.length} engagement snapshots, ${tickets.length} tickets.`);

  // ───────────── historical workflow runs + tasks + feedback + memory ─────────────
  // Spread over the last ~10 weeks so Evaluation's monthly trend and the
  // Timeline/Memory Graph have real history, not just "today".
  const runCustomers = customers.slice(0, 10); // most, not all — some accounts have no AI history yet, which is realistic
  let workflowRunCount = 0;
  let taskCount = 0;
  let feedbackCount = 0;
  let memoryCount = 0;

  for (const cust of runCustomers) {
    const runsForThisCustomer = randInt(1, 3);
    for (let i = 0; i < runsForThisCustomer; i++) {
      const startedDaysAgo = randInt(1, 70);
      const started = daysAgo(startedDaysAgo);
      const completed = new Date(new Date(started).getTime() + randInt(8, 45) * 1000).toISOString();
      const riskLevel = pick(RISK_LEVELS);
      const action = pick(ACTIONS);
      const confidence = Number((0.45 + Math.random() * 0.5).toFixed(2));
      const churnProbability = Number((riskLevel === 'critical' ? 0.7 + Math.random() * 0.25 : riskLevel === 'high' ? 0.5 + Math.random() * 0.25 : riskLevel === 'medium' ? 0.25 + Math.random() * 0.25 : Math.random() * 0.2).toFixed(2));
      const willDiscount = riskLevel === 'high' || riskLevel === 'critical';
      const slackMessage = pick(SLACK_TRIGGERS)(cust.company);

      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          customer_id: cust.id,
          title: `Follow up with ${cust.company}`,
          description: action,
          priority: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'medium',
          assignee: pick(['CS Team', 'Account Exec', 'Support Lead']),
          due_at: new Date(new Date(started).getTime() + 48 * 3600 * 1000).toISOString(),
          status: pick(['open', 'in_progress', 'done']),
        })
        .select()
        .single();
      if (taskErr) throw taskErr;
      taskCount++;

      const { data: run, error: runErr } = await supabase
        .from('workflow_runs')
        .insert({
          customer_id: cust.id,
          source: 'manual',
          slack_message: slackMessage,
          sentiment: riskLevel === 'low' ? 'neutral' : 'negative',
          sentiment_confidence: Number((0.6 + Math.random() * 0.35).toFixed(2)),
          churn_probability: churnProbability,
          risk_level: riskLevel,
          recommended_action: action,
          action_confidence: confidence,
          business_explanation: `${cust.company} shows ${riskLevel} churn risk based on recent engagement and support signals. Recommended: ${action.toLowerCase()}.`,
          draft_message: `Hi ${cust.name}, following up on your account — ${action.toLowerCase()}.`,
          discount: willDiscount ? { type: 'percentage', value: pick([10, 15, 20]), reason: 'Retention offer for at-risk enterprise account' } : null,
          task_id: task.id,
          status: 'completed',
          raw_llm_response: {
            decision: {
              missing_information: ['Most recent NPS response', 'Whether a competitor demo has been scheduled'],
              alternative_actions: [pick(ACTIONS), pick(ACTIONS)],
            },
          },
          started_at: started,
          completed_at: completed,
        })
        .select()
        .single();
      if (runErr) throw runErr;
      workflowRunCount++;

      // Most (not all) reviewed decisions get feedback — leaves some
      // "pending review" rows too, which is realistic.
      if (Math.random() < 0.75) {
        const approved = Math.random() < (confidence > 0.7 ? 0.8 : 0.45); // roughly calibrated: higher confidence -> more approvals
        await supabase
          .from('decision_feedback')
          .insert({
            workflow_run_id: run.id,
            customer_id: cust.id,
            recommended_action: action,
            decision: approved ? 'approved' : 'rejected',
            source: pick(['slack', 'dashboard']),
            reviewer: pick(['Alex (exec)', 'Jordan (CS lead)', 'Sam (RevOps)']),
            created_at: completed,
          })
          .throwOnError();
        feedbackCount++;
      }

      await supabase
        .from('conversation_memory')
        .insert([
          { customer_id: cust.id, workflow_run_id: run.id, role: 'event', content: slackMessage, created_at: started },
          { customer_id: cust.id, workflow_run_id: run.id, role: 'agent_decision', content: `${action} (confidence ${Math.round(confidence * 100)}%)`, created_at: completed },
        ])
        .throwOnError();
      memoryCount += 2;
    }
  }

  console.log(`  ${workflowRunCount} workflow runs, ${taskCount} tasks, ${feedbackCount} feedback rows, ${memoryCount} memory entries.`);
  console.log('Seed complete. Start the server (npm run dev) and refresh the dashboard.');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
