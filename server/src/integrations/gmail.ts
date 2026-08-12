import { getGoogleAccessToken } from './google.js';

/** Base64url-encode a raw RFC 2822 email — the format the Gmail API requires. */
function buildRawMessage({ to, subject, body }: { to: string; subject: string; body: string }): string {
  const message = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Real send via the Gmail API (POST /gmail/v1/users/me/messages/send). */
export async function sendGmail(input: { to: string; subject: string; body: string }): Promise<{ id: string }> {
  const accessToken = await getGoogleAccessToken();
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: buildRawMessage(input) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gmail send failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
