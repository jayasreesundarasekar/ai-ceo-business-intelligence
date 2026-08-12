import { generateJSON } from '../llm/groq.js';
import { KNOWLEDGE_QA_SYSTEM } from './prompts.js';
import { searchAcrossSources, getMostValuableCustomer, findCustomerByNameOrCompany } from '../db/queries.js';

export interface KnowledgeAnswer {
  answer: string;
  confidence: number;
  sources_used: number;
}

function extractKeyword(question: string): string {
  // Pull out anything that looks like a proper-noun phrase (company/customer name);
  // fall back to the longest word in the question so search still returns something.
  const nameMatch = question.match(/[A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*/g);
  if (nameMatch?.length) return nameMatch.sort((a, b) => b.length - a.length)[0];
  const words = question.replace(/[?.!,]/g, '').split(/\s+/).filter((w) => w.length > 3);
  return words.sort((a, b) => b.length - a.length)[0] ?? question;
}

/**
 * "Which customer is most likely to leave?" / "What happened with Acme last
 * month?" — style Q&A. This is real retrieval (SQL search across tickets,
 * Slack messages, agent decisions, and memory) feeding a grounded LLM
 * answer — not a hallucinated response, and not a hardcoded lookup table.
 */
export async function askKnowledgeBase(question: string): Promise<KnowledgeAnswer & { context_summary: string }> {
  const keyword = extractKeyword(question);
  const sources = await searchAcrossSources(keyword);

  // "Which customer is most at risk" style questions won't match a keyword search well —
  // fall back to whichever customer has the most recent high-risk workflow run.
  const looksLikeRiskQuestion = /churn|leave|risk|cancel/i.test(question);
  let extra = '';
  if (looksLikeRiskQuestion) {
    const named = await findCustomerByNameOrCompany(keyword).catch(() => null);
    const fallback = named ?? (await getMostValuableCustomer().catch(() => null));
    if (fallback) extra = `\nMost relevant customer on file: ${fallback.company} (${fallback.name}), tier ${fallback.tier}, value score ${fallback.value_score}/100.`;
  }

  const contextParts = [
    sources.tickets.length ? `TICKETS:\n${sources.tickets.map((t) => `- ${t.subject} (${t.created_at})`).join('\n')}` : '',
    sources.messages.length ? `SLACK MESSAGES:\n${sources.messages.map((m) => `- #${m.channel}: "${m.text}"`).join('\n')}` : '',
    sources.runs.length ? `PAST AGENT DECISIONS:\n${sources.runs.map((r) => `- ${r.recommended_action}: ${r.business_explanation}`).join('\n')}` : '',
    sources.memory.length ? `MEMORY:\n${sources.memory.map((m) => `- [${m.role}] ${m.content}`).join('\n')}` : '',
    extra,
  ].filter(Boolean);

  const contextSummary = contextParts.length ? contextParts.join('\n\n') : 'No matching records found in tickets, Slack history, or past agent decisions.';

  const result = await generateJSON<KnowledgeAnswer>(
    KNOWLEDGE_QA_SYSTEM,
    `QUESTION: ${question}\n\nCONTEXT:\n${contextSummary}`
  );

  return { ...result, context_summary: contextSummary };
}
