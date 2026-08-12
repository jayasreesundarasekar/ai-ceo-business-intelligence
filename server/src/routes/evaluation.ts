import { Router } from 'express';
import { getEvaluationMetrics } from '../db/queries.js';

// The AI CEO measuring its own effectiveness — decisions made, how many were
// trusted enough to be approved, estimated revenue protected, how fast it
// responds, retention outcomes, and whether its stated confidence is
// actually calibrated to real approval rates.
export const evaluationRouter = Router();

evaluationRouter.get('/', async (_req, res) => {
  try {
    res.json(await getEvaluationMetrics());
  } catch (err) {
    console.error('Evaluation metrics failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
