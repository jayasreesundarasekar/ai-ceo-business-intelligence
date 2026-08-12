import { generateJSON } from '../llm/groq.js';
import { MEETING_SUMMARY_SYSTEM } from './prompts.js';
import { insertTask } from '../db/queries.js';

export interface MeetingActionItem {
  title: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  due_hint: string;
}

export interface MeetingAnalysis {
  summary: string;
  key_decisions: string[];
  action_items: MeetingActionItem[];
  unresolved_issues: string[];
}

/** Summarize a meeting transcript, extract action items with owners, flag what's unresolved. */
export async function analyzeMeetingTranscript(transcript: string): Promise<MeetingAnalysis> {
  return generateJSON<MeetingAnalysis>(MEETING_SUMMARY_SYSTEM, `TRANSCRIPT:\n${transcript}`);
}

function dueHintToHours(hint: string): number {
  const lower = hint.toLowerCase();
  const num = parseInt(lower.match(/\d+/)?.[0] ?? '', 10);
  if (lower.includes('today') || lower.includes('eod')) return 8;
  if (lower.includes('tomorrow')) return 24;
  if (lower.includes('week')) return (num || 1) * 7 * 24;
  if (lower.includes('day')) return (num || 2) * 24;
  return 48;
}

/** Turn the extracted action items into real follow-up tasks — this is the
 * "Create Slack reminders automatically" step, minus the Slack push (tasks
 * already surface on the dashboard / weekly report). */
export async function createTasksFromMeeting(items: MeetingActionItem[]) {
  const created = [];
  for (const item of items) {
    const task = await insertTask({
      customer_id: null,
      title: item.title,
      description: `From meeting companion. Owner: ${item.owner}.`,
      priority: item.priority,
      assignee: item.owner,
      due_at: new Date(Date.now() + dueHintToHours(item.due_hint) * 3600 * 1000).toISOString(),
    });
    created.push(task);
  }
  return created;
}
