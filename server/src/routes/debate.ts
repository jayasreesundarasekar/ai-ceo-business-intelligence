import { Router } from 'express';
import { z } from 'zod';
import { runDebate } from '../agent/debate.js';

export const debateRouter = Router();

const runSchema = z.object({ topic: z.string().min(5) });

debateRouter.post('/run', async (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    res.json(await runDebate(parsed.data.topic));
  } catch (err) {
    console.error('Debate failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
