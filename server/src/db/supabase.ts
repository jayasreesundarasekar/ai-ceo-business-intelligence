import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// This file is imported (transitively, via queries.ts) by almost every
// route, so it's one of the very first things Node evaluates on startup.
// createClient() throws synchronously on an empty/invalid URL — without
// this check that crash is silent and cryptic, and the frontend just sees
// "Failed to fetch" on every request forever with no clue why. Fail loud
// and specific instead.
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.error('\n❌ Backend cannot start: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n');
  console.error('   Fix:');
  console.error('     cd server');
  console.error('     cp .env.example .env   # if you have not already');
  console.error('     # then open .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  console.error('     # from your Supabase project → Settings → API\n');
  console.error('   This is why every request from the frontend shows "Failed to fetch" —');
  console.error('   the backend process was never able to start.\n');
  process.exit(1);
}

// Service-role client: this only ever runs on the server, never sent to the browser.
export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { persistSession: false },
});
