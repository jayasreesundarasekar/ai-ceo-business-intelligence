import { config } from '../config.js';

/**
 * Thin client for Groq's hosted inference API (https://console.groq.com).
 * Groq runs open-source models (Llama 3.x, Mixtral, etc.) on custom LPU
 * hardware and is free to use with an API key — no local GPU/RAM needed,
 * which is why this replaced the local-Ollama client. Groq's free tier has
 * generous but real rate limits (requests/minute and tokens/minute, varies
 * by model) — it is not literally unlimited, but for a hackathon demo's
 * request volume it effectively never gets in the way. Get a key at
 * https://console.groq.com/keys.
 *
 * The API is OpenAI-compatible (POST /openai/v1/chat/completions), so
 * swapping to a different OpenAI-compatible provider later (OpenRouter,
 * Together, a self-hosted vLLM server, etc.) only means changing baseUrl/
 * model/apiKey below — `chat()`'s request/response shape stays the same.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function groqChat(messages: ChatMessage[], opts: { json?: boolean } = {}): Promise<string> {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys and add it to server/.env.');
  }

  const res = await fetch(`${config.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`,
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages,
      temperature: 0.3,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq request failed (${res.status}). Check GROQ_API_KEY and GROQ_MODEL in server/.env. ${body}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned no content');
  return content;
}

/** Free-form text generation (e.g. drafting an email). */
export async function generateText(system: string, prompt: string): Promise<string> {
  return groqChat([
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ]);
}

/**
 * Structured generation: asks the model to return JSON matching a shape you
 * describe in the prompt, then parses it. Groq's `response_format:
 * { type: "json_object" }` forces valid JSON output; we still defensively
 * try/catch and fall back once in case a model wraps it in fences anyway.
 */
export async function generateJSON<T>(system: string, prompt: string): Promise<T> {
  const raw = await groqChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: `${prompt}\n\nRespond with ONLY valid JSON. No markdown, no commentary.` },
    ],
    { json: true }
  );
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap JSON in ```json fences even in json mode; strip and retry once.
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}

/**
 * Reads an uploaded image (receipt, screenshot, printed report, etc.) using
 * a vision-capable Groq model and returns whatever text/data it can make
 * out — used by Data Import for image uploads instead of a separate OCR
 * dependency. `mimeType` should be the image's real content type
 * (e.g. "image/jpeg").
 */
export async function describeImage(base64Data: string, mimeType: string): Promise<string> {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys and add it to server/.env.');
  }

  const res = await fetch(`${config.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`,
    },
    body: JSON.stringify({
      model: config.groq.visionModel,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe every piece of text and tabular/numeric data visible in this image as plain text. Preserve structure (rows, labels, numbers) as best you can. If it looks like a customer list, invoice, spreadsheet screenshot, or support ticket, keep every row/field. Do not summarize or omit anything — output the raw content.',
            },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Groq vision request failed (${res.status}). GROQ_VISION_MODEL="${config.groq.visionModel}" may be retired — check https://console.groq.com/docs/models for a current vision-capable model. ${body}`
    );
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq vision returned no content');
  return content;
}
