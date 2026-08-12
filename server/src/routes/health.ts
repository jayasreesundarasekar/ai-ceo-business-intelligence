import { Router } from 'express';
import { computeHealthScore } from '../agent/healthScore.js';

export const healthScoreRouter = Router();

healthScoreRouter.get('/', async (_req, res) => {
  try {
    res.json(await computeHealthScore());
  } catch (err) {
    console.error('Health score computation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
