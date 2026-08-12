import { Router } from 'express';
import { getBusinessTimeline } from '../db/queries.js';

export const timelineRouter = Router();

timelineRouter.get('/', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 40;
  try {
    res.json(await getBusinessTimeline(limit));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
