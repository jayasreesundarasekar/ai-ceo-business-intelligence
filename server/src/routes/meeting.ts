import { Router } from 'express';
import { z } from 'zod';
import { analyzeMeetingTranscript, createTasksFromMeeting } from '../agent/meeting.js';

export const meetingRouter = Router();

const analyzeSchema = z.object({ transcript: z.string().min(10), createTasks: z.boolean().optional() });

meetingRouter.post('/analyze', async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const analysis = await analyzeMeetingTranscript(parsed.data.transcript);
    let tasksCreated = 0;
    if (parsed.data.createTasks && analysis.action_items.length) {
      const created = await createTasksFromMeeting(analysis.action_items);
      tasksCreated = created.length;
    }
    res.json({ ...analysis, tasks_created: tasksCreated });
  } catch (err) {
    console.error('Meeting analysis failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
