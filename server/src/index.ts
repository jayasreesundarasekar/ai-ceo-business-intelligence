import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { oauthRouter } from './slack/oauth.js';
import { eventsRouter } from './slack/events.js';
import { commandsRouter } from './slack/commands.js';
import { interactiveRouter } from './slack/interactive.js';
import { verifySlackSignature } from './slack/verify.js';
import { dashboardRouter } from './routes/dashboard.js';
import { workflowRouter } from './routes/workflow.js';
import { customersRouter } from './routes/customers.js';
import { briefingRouter } from './routes/briefing.js';
import { timelineRouter } from './routes/timeline.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { forecastRouter } from './routes/forecast.js';
import { reportsRouter } from './routes/reports.js';
import { evaluationRouter } from './routes/evaluation.js';
import { simulatorRouter } from './routes/simulator.js';
import { crisisRouter } from './routes/crisis.js';
import { healthScoreRouter } from './routes/health.js';
import { meetingRouter } from './routes/meeting.js';
import { strategyRouter } from './routes/strategy.js';
import { debateRouter } from './routes/debate.js';
import { graphRouter } from './routes/graph.js';
import { integrationsRouter } from './routes/integrations.js';
import { dataImportRouter } from './routes/dataImport.js';
import { initWebSocketServer, broadcast } from './ws.js';
import { detectCrises } from './agent/crisis.js';
import { isJiraConfigured, isHubspotConfigured, isGoogleConfigured, isGroqConfigured } from './config.js';

const app = express();

app.use(cors({ origin: config.corsOrigins }));

// Slack routes need the RAW request body to verify signatures, so we
// capture it here before any JSON/urlencoded parsing consumes the stream.
function captureRawBody(req: express.Request, _res: express.Response, buf: Buffer) {
  (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
}

app.use('/api/slack/events', express.json({ verify: captureRawBody }), verifySlackSignature);
app.use('/api/slack/commands', express.urlencoded({ extended: true, verify: captureRawBody }), verifySlackSignature);
app.use('/api/slack/interactive', express.urlencoded({ extended: true, verify: captureRawBody }), verifySlackSignature);

// Everything else: normal JSON body parsing.
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/slack/oauth', oauthRouter);
app.use('/api/slack/events', eventsRouter);
app.use('/api/slack/commands', commandsRouter);
app.use('/api/slack/interactive', interactiveRouter);

app.use('/api/dashboard', dashboardRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/customers', customersRouter);
app.use('/api/briefing', briefingRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/evaluation', evaluationRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/crisis', crisisRouter);
app.use('/api/health-score', healthScoreRouter);
app.use('/api/meeting', meetingRouter);
app.use('/api/strategy', strategyRouter);
app.use('/api/debate', debateRouter);
app.use('/api/graph', graphRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/data-import', dataImportRouter);

const server = app.listen(config.port, () => {
  console.log(`\n✅ AI CEO backend listening on http://localhost:${config.port}`);
  console.log(`   LLM: ${config.groq.model} via Groq (${isGroqConfigured() ? 'configured' : 'NOT CONFIGURED — set GROQ_API_KEY'})`);
  console.log(`   Jira: ${isJiraConfigured() ? 'configured' : 'not configured'}`);
  console.log(`   HubSpot: ${isHubspotConfigured() ? 'configured' : 'not configured'}`);
  console.log(`   Google (Gmail/Calendar): ${isGoogleConfigured() ? 'configured' : 'not configured'}`);
  console.log(`   If the frontend still shows "Failed to fetch", check VITE_API_URL in`);
  console.log(`   the root .env points at http://localhost:${config.port} and CORS_ORIGIN`);
  console.log(`   in server/.env matches the URL Vite is actually running on.\n`);
});

initWebSocketServer(server);

// Crisis Detection is proactive by design — poll on a fixed interval and
// push new alerts over the WebSocket rather than waiting for a dashboard
// refresh to notice. Dedup by alert id so a still-active alert isn't
// re-pushed every cycle.
const seenCrisisAlertIds = new Set<string>();
setInterval(async () => {
  try {
    const alerts = await detectCrises();
    for (const alert of alerts) {
      if (seenCrisisAlertIds.has(alert.id)) continue;
      seenCrisisAlertIds.add(alert.id);
      broadcast('crisis.detected', alert);
    }
    // Let a resolved alert be re-announced if it recurs later.
    for (const id of seenCrisisAlertIds) {
      if (!alerts.some((a) => a.id === id)) seenCrisisAlertIds.delete(id);
    }
  } catch (err) {
    console.error('Background crisis check failed', err);
  }
}, 60_000);
