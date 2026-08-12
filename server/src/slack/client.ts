import { WebClient } from '@slack/web-api';
import { config } from '../config.js';
import { supabase } from '../db/supabase.js';

/** Look up the bot token for a given team, falling back to the single
 * static SLACK_BOT_TOKEN (handy for local dev with a single-workspace
 * "Install to Workspace" install instead of the full OAuth flow). */
export async function getClientForTeam(teamId?: string): Promise<WebClient> {
  if (teamId) {
    const { data } = await supabase.from('slack_installations').select('bot_access_token').eq('team_id', teamId).single();
    if (data?.bot_access_token) return new WebClient(data.bot_access_token);
  }
  if (config.slack.botToken) return new WebClient(config.slack.botToken);
  throw new Error('No Slack bot token available — complete OAuth install or set SLACK_BOT_TOKEN for local dev.');
}

export async function postMessage(params: { teamId?: string; channel: string; text: string; blocks?: unknown[] }) {
  const client = await getClientForTeam(params.teamId);
  return client.chat.postMessage({ channel: params.channel, text: params.text, blocks: params.blocks as never });
}
