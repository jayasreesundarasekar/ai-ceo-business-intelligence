import { getGoogleAccessToken } from './google.js';

export interface CalendarEventInput {
  summary: string;
  description: string;
  startIso: string;
  durationMinutes?: number;
}

/** Real event creation via the Calendar API (POST /calendar/v3/calendars/primary/events). */
export async function createCalendarEvent(input: CalendarEventInput): Promise<{ id: string; htmlLink: string }> {
  const accessToken = await getGoogleAccessToken();
  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60 * 1000);

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      reminders: { useDefault: true },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Calendar event creation failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string; htmlLink: string };
  return { id: data.id, htmlLink: data.htmlLink };
}
