import { Router } from 'express';
import { getDashboardMetrics, getChurnRiskBreakdown, getRecentWorkflowRuns, getAllTasks } from '../db/queries.js';
import { supabase } from '../db/supabase.js';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', async (_req, res) => {
  try {
    res.json(await getDashboardMetrics());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

dashboardRouter.get('/churn', async (_req, res) => {
  try {
    res.json(await getChurnRiskBreakdown());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

dashboardRouter.get('/revenue', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('purchases').select('date, amount').order('date', { ascending: true });
    if (error) throw error;
    const byMonth = new Map<string, number>();
    for (const p of data ?? []) {
      const month = new Date(p.date).toLocaleString('en-US', { month: 'short' });
      byMonth.set(month, (byMonth.get(month) ?? 0) + Number(p.amount));
    }
    res.json(Array.from(byMonth.entries()).map(([date, revenue]) => ({ date, revenue })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// "Insights" = recent completed agent workflow runs, presented as executive insight cards.
dashboardRouter.get('/insights', async (_req, res) => {
  try {
    const runs = await getRecentWorkflowRuns(20);
    const insights = runs
      .filter((r) => r.status === 'completed')
      .map((r) => ({
        id: r.id,
        category: 'churn',
        severity: r.risk_level === 'critical' ? 'critical' : r.risk_level === 'high' ? 'warning' : 'info',
        title: `${r.recommended_action ?? 'Review'}: ${(r as { customers?: { company?: string } }).customers?.company ?? 'Unknown account'}`,
        description: r.business_explanation,
        action: r.recommended_action,
        metric: r.churn_probability ? `${Math.round(Number(r.churn_probability) * 100)}% churn probability` : undefined,
        timestamp: r.completed_at ?? r.started_at,
        read: false,
      }));
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

dashboardRouter.get('/tasks', async (_req, res) => {
  try {
    res.json(await getAllTasks());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
