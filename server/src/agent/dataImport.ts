import { generateJSON } from '../llm/groq.js';
import { DATA_IMPORT_SYSTEM } from './prompts.js';
import { extractTextFromFile, truncateForPrompt, type UploadedFile } from '../lib/extractText.js';

export interface ImportProposal {
  customers: Array<{
    company: string;
    contact_name: string;
    email: string | null;
    tier: 'enterprise' | 'pro' | 'starter';
    annual_value: number;
    value_score: number;
  }>;
  purchases: Array<{ customer_company: string; product: string; amount: number; plan: 'monthly' | 'annual' }>;
  tickets: Array<{ customer_company: string; subject: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
  summary: string;
}

export interface FileExtractionResult {
  filename: string;
  charactersExtracted: number;
  error?: string;
}

/**
 * Extracts text from every uploaded file (PDF/DOCX/image/CSV/TXT — see
 * extractText.ts), then makes one LLM call over the combined text to
 * propose structured customer/purchase/ticket records. Files that fail to
 * parse are skipped (reported in `fileResults`) rather than failing the
 * whole import — a demo dataset with 5 good files and 1 corrupt one should
 * still work.
 */
export async function parseDocumentsIntoProposal(
  files: UploadedFile[]
): Promise<{ proposal: ImportProposal; fileResults: FileExtractionResult[] }> {
  const fileResults: FileExtractionResult[] = [];
  const sections: string[] = [];

  for (const file of files) {
    try {
      const text = await extractTextFromFile(file);
      const trimmed = text.trim();
      fileResults.push({ filename: file.originalname, charactersExtracted: trimmed.length });
      if (trimmed.length > 0) {
        sections.push(`=== FILE: ${file.originalname} ===\n${truncateForPrompt(trimmed)}`);
      }
    } catch (err) {
      fileResults.push({ filename: file.originalname, charactersExtracted: 0, error: (err as Error).message });
    }
  }

  if (sections.length === 0) {
    return {
      proposal: { customers: [], purchases: [], tickets: [], summary: 'No readable text was found in the uploaded files.' },
      fileResults,
    };
  }

  const proposal = await generateJSON<ImportProposal>(DATA_IMPORT_SYSTEM, sections.join('\n\n'));
  return { proposal, fileResults };
}
