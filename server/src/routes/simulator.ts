import { Router } from 'express';
import { z } from 'zod';
import { runSimulation } from '../agent/simulator.js';

export const simulatorRouter = Router();

const runSchema = z.object({ scenario: z.string().min(3) });

simulatorRouter.post('/run', async (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    res.json(await runSimulation(parsed.data.scenario));
  } catch (err) {
    console.error('Simulation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
