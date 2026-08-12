import { Router } from 'express';
import { detectCrises } from '../agent/crisis.js';

export const crisisRouter = Router();

crisisRouter.get('/alerts', async (_req, res) => {
  try {
    res.json(await detectCrises());
  } catch (err) {
    console.error('Crisis detection failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
