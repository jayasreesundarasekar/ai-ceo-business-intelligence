import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { parseDocumentsIntoProposal } from '../agent/dataImport.js';
import { commitImportProposal } from '../db/queries.js';

export const dataImportRouter = Router();

// Memory storage — files are parsed in-process and never written to disk.
// 15MB/file cap keeps a single bad upload from blocking the event loop for
// too long during PDF/OCR extraction; 10 files/request is plenty for a demo dataset.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 10 } });

dataImportRouter.post('/parse', upload.array('files', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded. Attach at least one PDF, DOCX, image, or CSV/TXT file.' });
  }
  try {
    const { proposal, fileResults } = await parseDocumentsIntoProposal(
      files.map((f) => ({ originalname: f.originalname, mimetype: f.mimetype, buffer: f.buffer }))
    );
    res.json({ proposal, fileResults });
  } catch (err) {
    console.error('Data import parse failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

const customerSchema = z.object({
  company: z.string().min(1),
  contact_name: z.string(),
  email: z.string().nullable(),
  tier: z.enum(['enterprise', 'pro', 'starter']),
  annual_value: z.number(),
  value_score: z.number(),
});
const purchaseSchema = z.object({
  customer_company: z.string(),
  product: z.string(),
  amount: z.number(),
  plan: z.enum(['monthly', 'annual']),
});
const ticketSchema = z.object({
  customer_company: z.string(),
  subject: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
});
const commitSchema = z.object({
  proposal: z.object({
    customers: z.array(customerSchema),
    purchases: z.array(purchaseSchema),
    tickets: z.array(ticketSchema),
  }),
});

dataImportRouter.post('/commit', async (req, res) => {
  const parsed = commitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const result = await commitImportProposal(parsed.data.proposal);
    res.json(result);
  } catch (err) {
    console.error('Data import commit failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
