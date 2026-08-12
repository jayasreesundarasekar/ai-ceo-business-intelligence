import { Router } from 'express';
import { getOrCreateTodaysBriefing } from '../agent/multiAgent.js';

export const briefingRouter = Router();

briefingRouter.get('/today', async (_req, res) => {
  try {
    res.json(await getOrCreateTodaysBriefing());
  } catch (err) {
    console.error('Briefing generation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
