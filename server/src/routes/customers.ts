import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const customersRouter = Router();

customersRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('customers').select('*').order('annual_value', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

customersRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});
