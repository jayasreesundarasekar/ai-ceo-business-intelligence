-- Run this whole file once in the Supabase SQL editor (or `psql` for a
-- self-hosted Postgres instance). It replaces src/data/mockData.ts with
-- real, queryable tables.

create extension if not exists "pgcrypto";

-- ───────────────────── customers ─────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  tier text not null check (tier in ('enterprise', 'pro', 'starter')),
  value_score int not null check (value_score between 0 and 100),
  annual_value numeric not null default 0,
  email text not null,
  avatar text,
  active_subscriptions int not null default 0,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ───────────────────── purchases ─────────────────────
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date timestamptz not null default now(),
  product text not null,
  amount numeric not null,
  plan text not null
);

-- ───────────────────── engagement snapshots ─────────────────────
create table if not exists engagement_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date timestamptz not null default now(),
  logins_per_week numeric not null,
  feature_usage_score numeric not null,
  support_tickets int not null default 0,
  nps_score int,
  last_active timestamptz not null default now()
);

-- ───────────────────── support tickets ─────────────────────
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  subject text not null,
  body text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

-- ───────────────────── raw slack messages ─────────────────────
create table if not exists slack_messages (
  id uuid primary key default gen_random_uuid(),
  team_id text,
  channel text not null,
  slack_user_id text,
  text text not null,
  ts text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────── slack workspace installs (OAuth) ─────────────────────
create table if not exists slack_installations (
  id uuid primary key default gen_random_uuid(),
  team_id text unique not null,
  team_name text,
  bot_access_token text not null,
  bot_user_id text,
  authed_user_id text,
  scope text,
  installed_at timestamptz not null default now()
);

-- ───────────────────── follow-up tasks ─────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  workflow_run_id uuid,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  assignee text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

-- ───────────────────── agent workflow runs (the audit trail) ─────────────────────
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  source text not null default 'manual', -- 'slack_event' | 'slash_command' | 'manual'
  slack_message text not null,
  sentiment text,
  sentiment_confidence numeric,
  churn_probability numeric,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')),
  recommended_action text,
  action_confidence numeric,
  business_explanation text,
  draft_message text,
  discount jsonb,
  task_id uuid references tasks(id) on delete set null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  raw_llm_response jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ───────────────────── conversation / decision memory ─────────────────────
-- This is what lets the LLM reference past context instead of treating
-- every event independently: we fetch the last N rows for a customer and
-- fold them into the prompt (see server/src/agent/pipeline.ts).
create table if not exists conversation_memory (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  workflow_run_id uuid references workflow_runs(id) on delete set null,
  role text not null check (role in ('event', 'agent_decision', 'note')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_memory_customer on conversation_memory(customer_id, created_at desc);
create index if not exists idx_workflow_runs_customer on workflow_runs(customer_id, started_at desc);
create index if not exists idx_purchases_customer on purchases(customer_id);
create index if not exists idx_engagement_customer on engagement_snapshots(customer_id, date);

-- ───────────────────── human feedback on AI decisions (the "learning system") ─────────────────────
-- Every Approve/Dismiss click in Slack (or the dashboard) lands here. We
-- don't retrain a model on this — it's an LLM system, not a classifier —
-- but we DO aggregate approval rates per recommended_action and fold that
-- summary into future decision prompts, so the agent's own reasoning
-- adapts to what the business has actually approved of before.
create table if not exists decision_feedback (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid references workflow_runs(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  recommended_action text not null,
  decision text not null check (decision in ('approved', 'rejected')),
  source text not null default 'slack', -- 'slack' | 'dashboard'
  reviewer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_feedback_action on decision_feedback(recommended_action);

-- ───────────────────── cached daily executive briefings ─────────────────────
-- One row per calendar day so "Run today's executive briefing" doesn't
-- regenerate (and re-bill the LLM) on every page load.
create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  narrative text not null,
  revenue_summary text,
  risks jsonb,
  opportunities jsonb,
  recommended_actions jsonb,
  agent_reports jsonb, -- the finance/sales/support/marketing sub-agent outputs
  created_at timestamptz not null default now()
);

-- ───────────────────── third-party integration connections ─────────────────────
-- Generic store for OAuth/API tokens for Jira, Google (Gmail+Calendar), and
-- HubSpot. One row per provider; Jira/HubSpot use static API tokens from env
-- and don't need a row here unless you want per-install overrides.
create table if not exists integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('google', 'jira', 'hubspot')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  account_label text, -- e.g. the connected Gmail address
  metadata jsonb,
  connected_at timestamptz not null default now()
);

-- ───────────────────── seed data (optional, mirrors the old mock data) ─────────────────────
insert into customers (name, company, tier, value_score, annual_value, email, active_subscriptions, joined_at)
values ('Sarah Chen', 'XYZ Corp', 'enterprise', 82, 48000, 'sarah.chen@xyzcorp.com', 3, now() - interval '18 months')
on conflict do nothing;
