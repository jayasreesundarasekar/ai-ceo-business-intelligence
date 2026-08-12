import { Router } from 'express';
import { z } from 'zod';
import { isJiraConfigured, isHubspotConfigured, isGoogleConfigured } from '../config.js';
import { createJiraIssue } from '../integrations/jira.js';
import { upsertHubspotContact, logHubspotNote } from '../integrations/hubspot.js';
import { sendGmail } from '../integrations/gmail.js';
import { createCalendarEvent } from '../integrations/calendar.js';
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../integrations/google.js';
import { getWorkflowRunById } from '../db/queries.js';
import { supabase } from '../db/supabase.js';

export const integrationsRouter = Router();

// ───────────── status ─────────────

integrationsRouter.get('/status', async (_req, res) => {
  const { data: googleRow } = await supabase.from('integration_connections').select('account_label, connected_at').eq('provider', 'google').maybeSingle();
  res.json({
    jira: { configured: isJiraConfigured() },
    hubspot: { configured: isHubspotConfigured() },
    google: {
      configured: isGoogleConfigured(),
      connected: Boolean(googleRow),
      account: googleRow?.account_label ?? null,
      connectedAt: googleRow?.connected_at ?? null,
    },
  });
});

// ───────────── Google OAuth (Gmail + Calendar share one consent screen) ─────────────

integrationsRouter.get('/google/install', (_req, res) => {
  if (!isGoogleConfigured()) return res.status(400).send('Google integration not configured — set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
  res.redirect(buildGoogleAuthUrl());
});

integrationsRouter.get('/google/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) return res.status(400).send('Missing ?code from Google');
  try {
    const tokens = await exchangeGoogleCode(code);
    let accountLabel: string | null = null;
    try {
      const userinfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).then((r) => r.json() as Promise<{ email?: string }>);
      accountLabel = userinfo.email ?? null;
    } catch {
      // non-fatal — connection still works without the label
    }

    await supabase.from('integration_connections').upsert(
      {
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        account_label: accountLabel,
      },
      { onConflict: 'provider' }
    );

    res.send('<html><body style="font-family:sans-serif;padding:40px"><h2>✅ Google connected</h2><p>Gmail send and Calendar scheduling are now live. You can close this tab.</p></body></html>');
  } catch (err) {
    console.error('Google OAuth error', err);
    res.status(500).send('OAuth exchange failed — check server logs');
  }
});

// ───────────── action endpoints, each tied to a workflow run for context ─────────────

const runIdSchema = z.object({ workflowRunId: z.string().uuid() });

integrationsRouter.post('/jira/create-task', async (req, res) => {
  const parsed = runIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const run = await getWorkflowRunById(parsed.data.workflowRunId);
    const customer = (run as { customers?: { name?: string; company?: string } }).customers;
    const issue = await createJiraIssue({
      summary: `[AI CEO] ${run.recommended_action} — ${customer?.company ?? 'customer'}`,
      description: `${run.business_explanation}\n\nTriggering message: "${run.slack_message}"\nRisk level: ${run.risk_level}\nConfidence: ${Math.round(Number(run.action_confidence) * 100)}%`,
      priority: run.risk_level === 'critical' ? 'Highest' : run.risk_level === 'high' ? 'High' : 'Medium',
    });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

integrationsRouter.post('/gmail/send', async (req, res) => {
  const parsed = runIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const run = await getWorkflowRunById(parsed.data.workflowRunId);
    const customer = (run as { customers?: { name?: string; company?: string; email?: string } }).customers;
    const raw = (run.raw_llm_response ?? {}) as { draft?: { subject?: string; body?: string } };
    if (!customer?.email) throw new Error('No customer email on file for this workflow run.');
    const result = await sendGmail({
      to: customer.email,
      subject: raw.draft?.subject ?? `An update on your account, ${customer.name ?? ''}`,
      body: raw.draft?.body ?? run.business_explanation ?? '',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

integrationsRouter.post('/calendar/schedule', async (req, res) => {
  const parsed = runIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const run = await getWorkflowRunById(parsed.data.workflowRunId);
    const customer = (run as { customers?: { name?: string; company?: string } }).customers;
    const event = await createCalendarEvent({
      summary: `Follow up: ${customer?.company ?? 'customer'} — ${run.recommended_action}`,
      description: run.business_explanation ?? '',
      startIso: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      durationMinutes: 30,
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

integrationsRouter.post('/hubspot/sync', async (req, res) => {
  const parsed = runIdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const run = await getWorkflowRunById(parsed.data.workflowRunId);
    const customer = (run as { customers?: { name?: string; company?: string; email?: string } }).customers;
    if (!customer?.email) throw new Error('No customer email on file for this workflow run.');
    const [firstname, ...rest] = (customer.name ?? '').split(' ');
    const contact = await upsertHubspotContact({ email: customer.email, firstname, lastname: rest.join(' '), company: customer.company });
    await logHubspotNote(contact.id, `AI CEO decision: ${run.recommended_action}\n\n${run.business_explanation}`);
    res.json({ contactId: contact.id, synced: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
