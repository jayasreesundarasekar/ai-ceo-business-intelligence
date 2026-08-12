# AI CEO backend

Real backend for the app: Groq-powered agent pipeline (open-source LLM,
hosted, free), Supabase data, and a real Slack app (OAuth + Events API +
slash commands + interactive buttons).
Replaces `src/lib/workflowEngine.ts`'s scripted logic and `src/data/mockData.ts`.

## 1. Install dependencies

```bash
cd server
npm install
cp .env.example .env
```

## 2. Set up Groq (the real LLM — hosted, free, no local install)

1. Go to https://console.groq.com/keys and create a free account if you
   don't have one.
2. Click **Create API Key**, copy it.
3. In `server/.env`, set:
   ```
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   `llama-3.3-70b-versatile` is a strong open-source model and Groq's free
   tier default; if you hit rate limits during heavy demo use, smaller/faster
   options like `llama-3.1-8b-instant` also work well for this app's prompts
   and use less of your rate-limit budget per request. See
   https://console.groq.com/docs/models for the current list.

No local GPU, RAM, or install needed — inference runs on Groq's servers.
The free tier has real (generous, but not literally unlimited) rate limits;
for a hackathon demo's request volume it won't get in the way.

## 3. Set up Supabase (real data + memory)

1. Create a free project at https://supabase.com.
2. Open the SQL editor and run the entire contents of `server/schema.sql`.
   This creates `customers`, `purchases`, `engagement_snapshots`, `tickets`,
   `slack_messages`, `tasks`, `workflow_runs`, `conversation_memory`,
   `decision_feedback`, `daily_briefings`, etc., and seeds one example
   customer. If you already ran an earlier version of this file, just run
   it again — every statement is `create table if not exists` / additive,
   so it's safe to re-run.
3. In Project Settings → API, copy the **Project URL** and the
   **service_role** key (not the anon key — this server needs write access
   and never runs in the browser) into `.env`:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Add real customers/purchases/engagement rows via the SQL editor or Table
   editor — this is what replaced `mockData.ts`.

## 4. Create a real Slack app

1. Go to https://api.slack.com/apps → **Create New App** → *From scratch*.
   Name it and pick your workspace.
2. **OAuth & Permissions** (left sidebar):
   - Under *Bot Token Scopes* add: `chat:write`, `commands`,
     `channels:history`, `channels:read`, `im:history`, `users:read`.
   - Copy the **Client ID** and **Client Secret** from *Basic Information* →
     *App Credentials* into `.env` as `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
   - Copy the **Signing Secret** from the same page into
     `SLACK_SIGNING_SECRET` — this is what verifies every request actually
     came from Slack.
3. **Expose your local server publicly** (Slack requires HTTPS request URLs
   it can reach — your laptop's localhost isn't reachable from Slack's
   servers):
   ```bash
   npx ngrok http 8787
   ```
   Copy the `https://xxxx.ngrok.app` URL it gives you.
4. Set `SLACK_REDIRECT_URI=https://xxxx.ngrok.app/api/slack/oauth/callback`
   in `.env`, and also add that exact URL under **OAuth & Permissions** →
   *Redirect URLs*.
5. **Event Subscriptions**: turn on, set Request URL to
   `https://xxxx.ngrok.app/api/slack/events`. Slack will hit it immediately
   to verify — your server must already be running (step 6) for this to
   succeed. Under *Subscribe to bot events* add `message.channels` (and
   `message.im` if you want DMs too).
6. **Slash Commands** → *Create New Command* (register all three, same Request URL):
   - Command: `/churn-check`, Request URL: `https://xxxx.ngrok.app/api/slack/commands`
   - Command: `/ask-ceo`, same Request URL — natural-language Q&A over real stored data (tickets, Slack history, past agent decisions).
   - Command: `/briefing`, same Request URL — today's multi-agent executive briefing.
7. **Interactivity & Shortcuts**: turn on, Request URL:
   `https://xxxx.ngrok.app/api/slack/interactive`
8. **Install App** (top of *OAuth & Permissions*) → *Install to Workspace*.
   For quickest local testing you can copy the resulting **Bot User OAuth
   Token** (`xoxb-...`) straight into `.env` as `SLACK_BOT_TOKEN` and skip
   the full OAuth-per-workspace flow entirely. For a real multi-workspace
   install, instead send users to
   `GET /api/slack/oauth/install` — that's the "Add to Slack" button flow,
   and tokens get stored per-workspace in `slack_installations`.

## 5. Run it

```bash
npm run dev
```

Then in the frontend's `.env` (project root, not `server/`), set:
```
VITE_API_URL=http://localhost:8787
```

## Seeing "Failed to fetch" in the UI?

That means the frontend can't reach the backend at all — check these in order:

1. **Is `npm run dev` actually running in `server/` and did it print
   `AI CEO backend listening on http://localhost:8787`?** If it crashed
   instead, the most common cause is a missing `.env` — copy
   `.env.example` to `.env` and fill in `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` (step 3 above). The server now fails loudly
   with a clear message if these are missing, instead of crashing silently.
2. **Did you run `npm install` again after pulling a newer version of this
   project?** New dependencies (e.g. `ws` for live updates) won't be
   installed otherwise, and the server will crash on startup with
   `Cannot find module 'ws'`.
3. **Does `VITE_API_URL` in the project root's `.env` match the port the
   backend actually printed?** Default is `http://localhost:8787`.
4. **Does `CORS_ORIGIN` in `server/.env` match the URL Vite is running on?**
   If Vite picked a different port than 5173 (because 5173 was busy),
   requests will be blocked by CORS and show up in the browser as
   "Failed to fetch" too — check the terminal Vite is running in for the
   actual URL, and update `CORS_ORIGIN` (comma-separated if you need more
   than one) to match.

## AI features erroring but the rest of the app works?

That's a different symptom from "Failed to fetch" above — it means the
backend is up and reachable, but a specific request to Groq failed. Check:

1. **Is `GROQ_API_KEY` actually set in `server/.env`?** Get one free at
   https://console.groq.com/keys. Restart `npm run dev` after adding it —
   env vars are only read at startup.
2. **Rate limited?** Groq's free tier has per-minute and per-day limits
   that vary by model. The error message returned includes the HTTP status
   and Groq's response body, which will say `rate_limit_exceeded` if so —
   wait a minute and retry, or switch `GROQ_MODEL` to a smaller/faster model
   in `.env` (e.g. `llama-3.1-8b-instant`) which typically has a higher
   rate-limit budget.
3. **Wrong model name?** If `GROQ_MODEL` references a model Groq has
   deprecated or doesn't host, you'll get a 400 with a clear "model not
   found" message — check https://console.groq.com/docs/models for the
   current list.

## Seeding demo data without the terminal

`npm run db:setup` (a terminal script) is one way to populate demo data. The
other is the **Import Data** page in the app itself (`/data-import`): upload
PDFs, Word docs, JPEG/PNG images, or CSV/TXT files — a customer list,
invoices, support ticket logs, even a photo of a spreadsheet — and:

1. `POST /api/data-import/parse` extracts text from each file (`pdf-parse`
   for PDFs, `mammoth` for `.docx`, Groq's vision model for images, plain
   read for CSV/TXT), then one Groq call structures everything it finds into
   proposed customers/purchases/tickets.
2. The frontend shows a preview (counts + a customers table) before
   anything touches the database.
3. `POST /api/data-import/commit` inserts the approved rows. Customers are
   matched by company name (case-insensitive) so re-uploading the same
   document, or documents that mention the same company twice, won't create
   duplicates.

This needs `GROQ_VISION_MODEL` set (see `.env.example`) if you plan to
upload images — text-based files (PDF/DOCX/CSV/TXT) work regardless.

## What each Slack surface does

- **Events API** (`/api/slack/events`) — every message posted in a channel
  the bot is in gets logged to `slack_messages` and run through the full
  8-step agent pipeline; the result is posted back to the channel.
- **Slash command** (`/api/slack/commands`) — `/churn-check Acme Corp` runs
  the pipeline on demand and replies with risk level, recommended action,
  and Approve/Dismiss buttons.
- **Interactive buttons** (`/api/slack/interactive`) — Approve/Dismiss
  clicks are verified, logged to `conversation_memory`, and feed back into
  future reasoning for that account.
- **OAuth** (`/api/slack/oauth/install` → `/callback`) — lets you install
  the bot into any workspace without manually pasting a bot token.

## Notes on swapping to a different LLM provider

`src/llm/groq.ts` talks to Groq's OpenAI-compatible `/chat/completions`
endpoint. Most other hosted providers (OpenRouter, Together AI, Fireworks,
or a self-hosted vLLM/Ollama server) expose the same shape, so switching is
usually just:

1. Change `GROQ_BASE_URL` in `.env` to the new provider's endpoint (e.g.
   `https://openrouter.ai/api/v1` for OpenRouter).
2. Change `GROQ_MODEL` to a model name that provider supports.
3. Update `GROQ_API_KEY` to that provider's key.

The `chat()`/`generateJSON()`/`generateText()` functions in `groq.ts` don't
need to change — everything downstream (prompts, JSON parsing, the
pipeline) stays the same since the request/response shape is standardized.
`response_format: { type: "json_object" }` is widely but not universally
supported — if a provider rejects it, drop that option and rely on the
existing try/catch fence-stripping fallback in `generateJSON()` instead.

## Everything else this backend now does

- `GET /api/briefing/today` — multi-agent executive briefing. Four
  specialist agents (Finance, Sales, Support, Marketing — `src/agent/multiAgent.ts`)
  each analyze their slice of real data in parallel, then a CEO agent
  synthesizes their reports into one narrative. Cached per calendar day in
  `daily_briefings` so it isn't regenerated (and re-billed) on every page load.
- `GET /api/timeline` — merged, real-time-ordered feed of Slack messages,
  agent runs, tasks, and approve/dismiss feedback (`src/db/queries.ts` →
  `getBusinessTimeline`).
- `POST /api/knowledge/ask { question }` — business knowledge base Q&A.
  Does a real keyword search across tickets, Slack messages, past agent
  decisions, and memory, then asks the LLM to answer using only that
  retrieved context (`src/agent/knowledgeBase.ts`). Same logic powers the
  `/ask-ceo` Slack command. Honest limitation: it searches what's actually
  in this database (tickets, Slack, agent history) — there's no email/CRM
  ingestion here, so questions about sources outside this schema won't have
  an answer to retrieve.
- `GET /api/forecast` — revenue/churn/ticket-volume forecast
  (`src/agent/forecast.ts`), reasoned by the LLM over real historical rows.
  This is explicitly **not** a trained statistical model — it's disclosed as
  an LLM estimate with calibrated confidence, and there's no "employee
  burnout" prediction because this schema has no HR/headcount data to
  reason over (fabricating that would be worse than not having it).
- `GET /api/reports/weekly` — streams a real PDF (via `pdfkit`) built from
  live metrics, churn breakdown, open tasks, and today's briefing.
- The "learning system": every Approve/Dismiss click in Slack
  (`src/slack/interactive.ts`) is stored in `decision_feedback`. The next
  decision prompt in `pipeline.ts` includes the approval rate per action
  type, so the LLM leans toward what's actually been accepted before —
  this is prompt-level adaptation, not model retraining.
