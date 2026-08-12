import { describeImage } from '../llm/groq.js';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Extracts readable text from an uploaded file, whatever format it's in.
 * This is the "understand the document" half of Data Import; the "turn it
 * into customers/purchases/tickets" half lives in agent/dataImport.ts.
 */
export async function extractTextFromFile(file: UploadedFile): Promise<string> {
  const name = file.originalname.toLowerCase();

  if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(file.buffer);
    return result.text;
  }

  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (file.mimetype.startsWith('image/') || /\.(jpe?g|png|webp)$/.test(name)) {
    const base64 = file.buffer.toString('base64');
    return describeImage(base64, file.mimetype || 'image/jpeg');
  }

  // Plain text, CSV, TSV, markdown — just read as UTF-8.
  if (file.mimetype.startsWith('text/') || /\.(csv|tsv|txt|md)$/.test(name)) {
    return file.buffer.toString('utf-8');
  }

  throw new Error(
    `Unsupported file type for "${file.originalname}" (${file.mimetype || 'unknown'}). Supported: PDF, DOCX, JPEG/PNG, CSV/TSV/TXT.`
  );
}

/** Truncates very long extracted text so a handful of big files don't blow the LLM's context window. */
export function truncateForPrompt(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[...truncated, ${text.length - maxChars} more characters not shown...]`;
}
