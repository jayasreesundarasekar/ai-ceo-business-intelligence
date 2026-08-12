import { Router } from 'express';
import { getMemoryGraph } from '../db/queries.js';

export const graphRouter = Router();

graphRouter.get('/', async (_req, res) => {
  try {
    res.json(await getMemoryGraph());
  } catch (err) {
    console.error('Memory graph query failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
