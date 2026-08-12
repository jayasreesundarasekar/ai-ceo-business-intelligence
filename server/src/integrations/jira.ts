import { config, isJiraConfigured } from '../config.js';

/**
 * Real Jira Cloud REST API v3 integration (basic auth: email + API token,
 * per https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).
 * No SDK — Jira's REST API is simple enough for plain fetch, and it keeps
 * the dependency footprint small.
 */
function authHeader() {
  const token = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
  return `Basic ${token}`;
}

export interface JiraIssueInput {
  summary: string;
  description: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low';
}

export async function createJiraIssue(input: JiraIssueInput): Promise<{ key: string; url: string }> {
  if (!isJiraConfigured()) throw new Error('Jira is not configured (JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN).');

  const res = await fetch(`${config.jira.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: config.jira.projectKey },
        summary: input.summary,
        issuetype: { name: 'Task' },
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }],
        },
        ...(input.priority ? { priority: { name: input.priority } } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira issue creation failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { key: string };
  return { key: data.key, url: `${config.jira.baseUrl}/browse/${data.key}` };
}
