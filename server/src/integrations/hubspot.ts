import { config, isHubspotConfigured } from '../config.js';

/**
 * Real HubSpot integration via a private-app access token (Settings →
 * Integrations → Private Apps in HubSpot). Simpler and more reliable for a
 * server-to-server integration than the OAuth app flow, and the standard
 * approach HubSpot recommends for internal tools. Plain fetch — HubSpot's
 * REST API doesn't need a heavy SDK for this.
 */
function authHeader() {
  return `Bearer ${config.hubspot.accessToken}`;
}

export interface HubspotContactInput {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
}

/** Upsert a contact by email (HubSpot's search-and-create-if-missing pattern). */
export async function upsertHubspotContact(input: HubspotContactInput): Promise<{ id: string }> {
  if (!isHubspotConfigured()) throw new Error('HubSpot is not configured (HUBSPOT_ACCESS_TOKEN).');

  const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: input.email }] }],
      limit: 1,
    }),
  });
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { results: Array<{ id: string }> };
    if (searchData.results?.length) return { id: searchData.results[0].id };
  }

  const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        email: input.email,
        firstname: input.firstname ?? '',
        lastname: input.lastname ?? '',
        company: input.company ?? '',
      },
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => '');
    throw new Error(`HubSpot contact creation failed (${createRes.status}): ${body}`);
  }
  const data = (await createRes.json()) as { id: string };
  return { id: data.id };
}

/** Log a timeline note on a contact — used to record the AI's decision + reasoning in the CRM. */
export async function logHubspotNote(contactId: string, note: string): Promise<void> {
  if (!isHubspotConfigured()) throw new Error('HubSpot is not configured (HUBSPOT_ACCESS_TOKEN).');

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        hs_note_body: note,
        hs_timestamp: Date.now(),
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }], // note-to-contact
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HubSpot note logging failed (${res.status}): ${body}`);
  }
}
