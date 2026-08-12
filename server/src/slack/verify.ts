import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

/**
 * Verifies the X-Slack-Signature header per Slack's signing-secret scheme:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 * Must run on the RAW request body, so index.ts mounts a raw-body parser
 * for these routes before this middleware.
 */
export function verifySlackSignature(req: Request, res: Response, next: NextFunction) {
  if (!config.slack.signingSecret) {
    return res.status(500).json({ error: 'SLACK_SIGNING_SECRET is not configured on the server' });
  }

  const timestamp = req.header('X-Slack-Request-Timestamp');
  const signature = req.header('X-Slack-Signature');
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!timestamp || !signature || !rawBody) {
    return res.status(400).send('Missing Slack signature headers');
  }

  // Reject requests older than 5 minutes to prevent replay attacks.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) {
    return res.status(400).send('Stale request');
  }

  const base = `v0:${timestamp}:${rawBody.toString('utf8')}`;
  const hmac = crypto.createHmac('sha256', config.slack.signingSecret).update(base).digest('hex');
  const expected = `v0=${hmac}`;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).send('Invalid Slack signature');
  }

  next();
}
