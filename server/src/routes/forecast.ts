import { Router } from 'express';
import { generateForecast } from '../agent/forecast.js';

export const forecastRouter = Router();

forecastRouter.get('/', async (_req, res) => {
  try {
    res.json(await generateForecast());
  } catch (err) {
    console.error('Forecast generation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
