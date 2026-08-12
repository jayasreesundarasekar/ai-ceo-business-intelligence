import { Router } from 'express';
import { z } from 'zod';
import { askKnowledgeBase } from '../agent/knowledgeBase.js';

export const knowledgeRouter = Router();

const askSchema = z.object({ question: z.string().min(1) });

knowledgeRouter.post('/ask', async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    res.json(await askKnowledgeBase(parsed.data.question));
  } catch (err) {
    console.error('Knowledge base query failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
