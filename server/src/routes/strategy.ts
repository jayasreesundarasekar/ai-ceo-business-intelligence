import { Router } from 'express';
import { z } from 'zod';
import { generateStrategy } from '../agent/strategy.js';

export const strategyRouter = Router();

const planSchema = z.object({ goal: z.string().min(5) });

strategyRouter.post('/plan', async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    res.json(await generateStrategy(parsed.data.goal));
  } catch (err) {
    console.error('Strategy generation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
