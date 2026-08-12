import { Router } from 'express';
import { WebClient } from '@slack/web-api';
import { config } from '../config.js';
import { supabase } from '../db/supabase.js';

export const oauthRouter = Router();

const BOT_SCOPES = [
  'chat:write',
  'commands',
  'channels:history',
  'channels:read',
  'im:history',
  'users:read',
].join(',');

/** GET /api/slack/oauth/install — redirect the browser here to start "Add to Slack". */
oauthRouter.get('/install', (req, res) => {
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', config.slack.clientId);
  url.searchParams.set('scope', BOT_SCOPES);
  url.searchParams.set('redirect_uri', config.slack.redirectUri);
  res.redirect(url.toString());
});

/** GET /api/slack/oauth/callback — Slack redirects here after the user approves. */
oauthRouter.get('/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) return res.status(400).send('Missing ?code from Slack');

  try {
    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: config.slack.redirectUri,
    });

    if (!result.ok || !result.access_token || !result.team?.id) {
      return res.status(400).send('Slack OAuth exchange failed');
    }

    await supabase.from('slack_installations').upsert({
      team_id: result.team.id,
      team_name: result.team.name,
      bot_access_token: result.access_token,
      bot_user_id: (result as { bot_user_id?: string }).bot_user_id,
      authed_user_id: result.authed_user?.id,
      scope: result.scope,
    });

    res.send('<html><body style="font-family:sans-serif;padding:40px"><h2>✅ Slack connected</h2><p>You can close this tab and return to the dashboard.</p></body></html>');
  } catch (err) {
    console.error('Slack OAuth error', err);
    res.status(500).send('OAuth exchange failed — check server logs');
  }
});

/** GET /api/slack/oauth/status — used by the frontend Slack settings page. */
oauthRouter.get('/status', async (_req, res) => {
  const { data, error } = await supabase.from('slack_installations').select('team_id, team_name, installed_at').order('installed_at', { ascending: false }).limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.json({ connected: false });
  res.json({ connected: true, workspace: data[0].team_name, installedAt: data[0].installed_at });
});
