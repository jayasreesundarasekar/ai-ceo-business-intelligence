import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { getDashboardMetrics, getChurnRiskBreakdown, getAllTasks } from '../db/queries.js';
import { getOrCreateTodaysBriefing } from '../agent/multiAgent.js';

export const reportsRouter = Router();

/**
 * GET /api/reports/weekly — streams a real PDF built from live data
 * (dashboard metrics, churn breakdown, open tasks, and today's AI-generated
 * executive briefing). No template file, no static content — generated
 * fresh from the database and the LLM on every request.
 */
reportsRouter.get('/weekly', async (_req, res) => {
  try {
    const [metrics, churn, tasks, briefing] = await Promise.all([
      getDashboardMetrics(),
      getChurnRiskBreakdown(),
      getAllTasks(10),
      getOrCreateTodaysBriefing(),
    ]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ai-ceo-weekly-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('AI CEO — Executive Report', { align: 'left' });
    doc.fontSize(10).fillColor('#666').text(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    doc.moveDown(1.5);

    doc.fillColor('#000').fontSize(14).text('Executive Summary');
    doc.fontSize(10).fillColor('#333').text(briefing.narrative, { align: 'left' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Key Metrics');
    doc.fontSize(10).fillColor('#333');
    doc.text(`Monthly Recurring Revenue: $${metrics.mrr.toLocaleString()}`);
    doc.text(`Customers: ${metrics.customerCount}`);
    doc.text(`High-risk accounts: ${metrics.highRiskAccounts} of ${metrics.totalWorkflowRuns} analyzed`);
    doc.text(`Avg logins/week (recent): ${metrics.avgLoginsPerWeek}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Churn Risk by Month');
    doc.fontSize(10).fillColor('#333');
    for (const c of churn) doc.text(`${c.month}: ${c.rate}% at-risk (${c.atRisk} accounts)`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Risks');
    doc.fontSize(10).fillColor('#333');
    for (const r of briefing.risks) doc.text(`• ${r}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Opportunities');
    doc.fontSize(10).fillColor('#333');
    for (const o of briefing.opportunities) doc.text(`• ${o}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Recommended Actions');
    doc.fontSize(10).fillColor('#333');
    for (const a of briefing.recommended_actions) doc.text(`• ${a}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(14).text('Open Follow-up Tasks');
    doc.fontSize(10).fillColor('#333');
    for (const t of tasks as Array<{ title: string; priority: string; status: string }>) {
      doc.text(`[${t.priority.toUpperCase()}] ${t.title} — ${t.status}`);
    }

    doc.end();
  } catch (err) {
    console.error('Report generation failed', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
