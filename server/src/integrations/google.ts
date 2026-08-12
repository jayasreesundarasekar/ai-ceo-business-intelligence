import { config, isGoogleConfigured } from '../config.js';
import { supabase } from '../db/supabase.js';

/**
 * Google OAuth2 via plain fetch against Google's token/userinfo endpoints —
 * no `googleapis` SDK dependency needed for the two calls we actually make
 * (Gmail send, Calendar insert), both of which are simple REST POSTs.
 */
const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'].join(' ');

export function buildGoogleAuthUrl(): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.google.clientId);
  url.searchParams.set('redirect_uri', config.google.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', SCOPES);
  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text().catch(() => '')}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope: string }>;
}

async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text().catch(() => '')}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

/** Returns a valid access token for the connected Google account, refreshing if expired. */
export async function getGoogleAccessToken(): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google integration is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');

  const { data, error } = await supabase.from('integration_connections').select('*').eq('provider', 'google').single();
  if (error || !data) throw new Error('Google account not connected yet — visit Settings to connect Gmail/Calendar.');

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return data.access_token as string;

  if (!data.refresh_token) throw new Error('Google connection expired and has no refresh token — reconnect in Settings.');
  const refreshed = await refreshGoogleToken(data.refresh_token as string);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase.from('integration_connections').update({ access_token: refreshed.access_token, expires_at: newExpiresAt }).eq('provider', 'google');
  return refreshed.access_token;
}
