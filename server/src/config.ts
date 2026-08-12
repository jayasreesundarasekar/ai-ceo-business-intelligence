import 'dotenv/config';

function required(name: string, fallback = ''): string {
  const val = process.env[name] ?? fallback;
  return val;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),

  groq: {
    apiKey: required('GROQ_API_KEY'),
    model: required('GROQ_MODEL', 'llama-3.3-70b-versatile'),
    // A vision-capable model, used only for reading text out of uploaded
    // images in Data Import. Text-only prompts everywhere else use `model`
    // above. Check https://console.groq.com/docs/models for the current
    // vision-capable model name if this one is retired.
    visionModel: required('GROQ_VISION_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct'),
    baseUrl: required('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
  },

  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  slack: {
    clientId: required('SLACK_CLIENT_ID'),
    clientSecret: required('SLACK_CLIENT_SECRET'),
    signingSecret: required('SLACK_SIGNING_SECRET'),
    botToken: required('SLACK_BOT_TOKEN'),
    redirectUri: required('SLACK_REDIRECT_URI', 'http://localhost:8787/api/slack/oauth/callback'),
  },

  jira: {
    baseUrl: required('JIRA_BASE_URL'), // e.g. https://your-domain.atlassian.net
    email: required('JIRA_EMAIL'),
    apiToken: required('JIRA_API_TOKEN'),
    projectKey: required('JIRA_PROJECT_KEY', 'CEO'),
  },

  hubspot: {
    accessToken: required('HUBSPOT_ACCESS_TOKEN'), // private-app token
  },

  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectUri: required('GOOGLE_REDIRECT_URI', 'http://localhost:8787/api/integrations/google/callback'),
  },
};

export function isJiraConfigured() {
  return Boolean(config.jira.baseUrl && config.jira.email && config.jira.apiToken);
}
export function isHubspotConfigured() {
  return Boolean(config.hubspot.accessToken);
}
export function isGoogleConfigured() {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

export function isGroqConfigured() {
  return Boolean(config.groq.apiKey);
}

export function assertConfigured(keys: Array<'supabase' | 'groq' | 'slack'>) {
  const missing: string[] = [];
  if (keys.includes('supabase') && (!config.supabase.url || !config.supabase.serviceRoleKey)) {
    missing.push('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  if (keys.includes('groq') && !config.groq.apiKey) {
    missing.push('GROQ_API_KEY');
  }
  if (keys.includes('slack') && (!config.slack.signingSecret)) {
    missing.push('SLACK_SIGNING_SECRET');
  }
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}. Copy server/.env.example to server/.env and fill it in.`);
  }
}
