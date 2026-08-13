# AI CEO — Autonomous Business Intelligence & Decision Agent

> **AI-powered business decision and execution infrastructure for modern teams.**

AI CEO is a full-stack SaaS platform that goes beyond passive business analytics. It continuously monitors customer and operational signals, reasons over business data, detects risks and opportunities, recommends explainable actions, and—under human supervision—executes those actions across connected business systems.

## 🌐 Live Demo

**[🚀 Launch AI CEO](https://ai-ceo-business-intelligence-wif4-q0lkvjtjs.vercel.app/)**

### Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Supabase
- **AI inference:** Groq

### The core idea

**Traditional BI**

`Business Data → Dashboard → Human Thinks → Human Acts`

**AI CEO**

`Business Data → AI Detects → AI Reasons → AI Recommends → Human Approves → AI Executes → Outcome Measured → AI Evaluated`

The goal is **human-supervised autonomous execution**: AI handles analysis and operational work while people remain in control of consequential decisions.

---

## 🚀 Why AI CEO?

Most business intelligence tools stop at charts, dashboards, and alerts.

AI CEO is designed to close the loop between **business intelligence and business action**.

For example:

> A high-value customer shows negative sentiment and rising churn risk → AI CEO investigates the customer's history → Sales, Finance, and Support agents evaluate the situation → the CEO agent produces an explainable recommendation → a human approves it → AI CEO creates a Jira ticket, sends customer outreach through Gmail, schedules a follow-up in Google Calendar, updates HubSpot, and records the resulting outcome.

This turns AI from a passive assistant into an **auditable decision and execution layer**.

---

## ✨ Core Capabilities

### 🤖 Agentic Decision Pipeline

When a business event arrives—such as a Slack message, support escalation, or manually triggered scenario—AI CEO:

1. Retrieves relevant customer, purchase, engagement, and support data.
2. Analyzes sentiment and business context.
3. Scores churn probability and risk level.
4. Identifies potential risks or opportunities.
5. Generates an explainable recommendation.
6. Produces a confidence score and supporting rationale.
7. Suggests retention actions, discounts, tasks, and outreach.
8. Logs the decision as an auditable workflow.
9. Requests human approval or rejection.
10. Executes approved actions.
11. Records outcomes for evaluation and confidence calibration.

---

## 🧠 Multi-Agent Debate

AI CEO can evaluate important decisions through multiple business perspectives.

### Sales Agent
Evaluates:
- customer relationship
- upsell opportunities
- retention strategy
- commercial impact

### Finance Agent
Evaluates:
- discount economics
- revenue impact
- margin implications
- expected ROI

### Support Agent
Evaluates:
- unresolved issues
- ticket history
- service quality
- customer sentiment

### CEO Agent
The CEO agent weighs the competing recommendations and produces the final recommendation, including:

- recommended action
- reasoning
- confidence
- risks
- expected business impact

---

## 👤 Human-in-the-Loop

AI CEO is intentionally designed for **human-supervised autonomous execution**.

Every consequential AI recommendation can be:

- ✅ Approved
- ❌ Rejected

Human decisions are recorded and fed into evaluation and calibration metrics.

This creates an auditable loop:

`AI Recommendation → Human Decision → Real Action → Outcome → Evaluation`

---

## ⚡ Real-World Execution

Approved recommendations can become actual business actions.

| Integration | Example action |
|---|---|
| **Jira** | Create and track a customer-risk ticket |
| **Gmail** | Send customer outreach |
| **Google Calendar** | Schedule a follow-up |
| **HubSpot** | Sync contact information and CRM notes |
| **Slack** | Receive events, approvals, alerts, and workflow updates |

The product therefore connects AI reasoning to operational systems rather than stopping at generated text.

---

## 📊 Executive Intelligence

### Executive Dashboard

Provides live visibility into:

- MRR
- churn rate
- customer count
- revenue trends
- churn trends
- AI-generated executive briefing

### Command Center

A unified operational view containing:

- company health score
- active crisis alerts
- revenue
- open tasks
- recent AI activity

### AI Insights

AI-generated insights include expandable **Why?** explanations and confidence indicators.

### Decision Timeline

A chronological audit trail of:

- AI decisions
- human approvals/rejections
- actions
- tasks
- workflow activity

---

## 📈 AI Evaluation & Business Impact

AI CEO does not only make decisions—it measures how well those decisions perform.

Tracked metrics include:

- decisions made
- human acceptance rate
- revenue protected
- response time
- retention rate
- confidence calibration

This enables the system to evaluate whether its recommendations are actually useful.

---

## 🧮 Business Simulator

AI CEO supports scenario planning such as:

> **"What happens if we discount 20%?"**

The simulator reasons using business data including:

- MRR
- churn
- customer tiers
- revenue
- discount assumptions

This helps users explore potential business outcomes before taking action.

---

## 🗺️ Business Memory Graph

An SVG-rendered knowledge graph connects business entities such as:

**Customers → Purchases → Tickets → Decisions → Tasks → Outcomes**

This provides a visual representation of the system's accumulated business context.

---

## 🧑‍💼 Strategy Mode

Generates strategic growth plans containing:

- initiatives
- risks
- expected ROI
- timelines
- recommended actions

---

## 🎙️ Meeting Companion

Transforms meeting transcripts into:

- summaries
- owned action items
- unresolved issues

Optional follow-up tasks can be created from the extracted actions.

---

## 💬 Ask AI CEO

Natural-language Q&A over the company's business data.

Example questions:

> "Which customers are currently at the highest churn risk?"

> "Why did our company health score decrease this week?"

> "Which customers represent the biggest upsell opportunities?"

---

## 🚨 Crisis Detection

Background monitoring detects changes such as:

- ticket spikes
- churn-risk spikes
- sentiment shifts

New alerts are pushed to connected clients in real time using WebSockets.

---

## ❤️ Live Company Health Score

AI CEO calculates a composite **0–100 Company Health Score** from weighted components including:

- Sales
- Satisfaction
- Support
- Churn
- AI Trust

The system also generates an AI-written explanation describing what changed and why.

---

## 📄 Autonomous Weekly CEO Report

AI CEO can generate a downloadable PDF executive report summarizing company performance, decisions, risks, and activity.

---

## ⚡ Real-Time Architecture

Native WebSockets push live updates for:

- new AI decisions
- crisis alerts
- approval/rejection feedback
- agent activity

Open dashboard tabs update automatically with connection status and live toast notifications.

---

# 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    React + Vite                          │
│                AI CEO Executive UI                      │
└──────────────────────────┬───────────────────────────────┘
                           │
                      REST + WebSocket
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│             Node.js + Express + TypeScript               │
│                                                          │
│ Agent Pipeline │ AI Tools │ Workflows │ Integrations    │
└───────────────┬──────────────────────┬───────────────────┘
                │                      │
                ▼                      ▼
┌────────────────────────┐   ┌─────────────────────────────┐
│       Supabase         │   │          Groq LLM           │
│   Hosted PostgreSQL    │   │     Llama 3.3 inference     │
└────────────────────────┘   └─────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│                 External Integrations                    │
│                                                          │
│ Slack │ Jira │ HubSpot │ Google Gmail │ Google Calendar │
└──────────────────────────────────────────────────────────┘
```

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS |
| Visualization | Recharts |
| Animation | Framer Motion |
| Icons | Lucide |
| Backend | Node.js, Express, TypeScript |
| Runtime | `tsx` |
| Database | Supabase / hosted PostgreSQL |
| AI / LLM | Groq hosted inference, Llama 3.3 |
| Real-time | Native WebSocket server using `ws` |
| Validation | Zod |
| PDF generation | PDFKit |
| CRM | HubSpot CRM API |
| Project management | Jira REST API v3 |
| Communication | Slack |
| Email | Google Gmail OAuth2 |
| Scheduling | Google Calendar OAuth2 |

---

# 🔌 Integrations

| Integration | Purpose |
|---|---|
| **Slack** | Events, slash commands, approvals, interactive workflows |
| **Jira** | Create and track tickets |
| **HubSpot** | CRM contact synchronization and notes |
| **Google Gmail** | Customer outreach |
| **Google Calendar** | Follow-up scheduling |
| **Supabase** | Persistent business data and application state |
| **Groq** | Hosted LLM inference |

---

# 🧪 Demo & Seed Data

The repository includes realistic synthetic seed data for approximately **14 companies**, including:

- purchase history
- support tickets
- historical AI decisions
- calibrated approval/rejection feedback

### Demo scenarios

- Churn events
- Complaint spikes
- Upsell signals
- Renewal negotiations

The seed/demo records are synthetic and intended for testing and demonstration unless explicitly identified as public-source data.

---

# 🎬 Recommended Demo Flow

A representative AI CEO workflow looks like this:

```text
Customer complaint / business event
                ↓
        Context retrieval
                ↓
         Sentiment analysis
                ↓
         Churn / risk scoring
                ↓
       Multi-agent evaluation
        ↙        ↓        ↘
     Sales     Finance    Support
        \        |        /
              CEO Agent
                ↓
       Explainable recommendation
                ↓
           Human approval
                ↓
        Real-world execution
        ↙       ↓       ↘
     Jira     Gmail    Calendar
                ↓
              HubSpot
                ↓
           Outcome tracking
                ↓
        Evaluation & calibration
```

This demonstrates the central product principle:

> **AI should not only tell a business what is happening—it should help decide what to do, execute approved actions, and measure the result.**

---

# 🔐 Security & Configuration

The Supabase service-role key runs **server-side only**. The frontend never receives it.

Keep all credentials outside source control.

Use `.env.example` files as templates and **never commit real `.env` files**.

Example configuration:

```env
GROQ_API_KEY=your_groq_api_key

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

JIRA_API_TOKEN=your_jira_token
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
SLACK_BOT_TOKEN=your_slack_bot_token
```

### Never commit:

- API keys
- OAuth client secrets
- service-role keys
- access tokens
- `.env` files
- private credentials

### Production Configuration

The deployed frontend is hosted on Vercel and communicates with the production backend hosted on Render.

```env
VITE_API_URL=https://ai-ceo-backend-1ouf.onrender.com
```

The production frontend is available at:

**[🚀 AI CEO — Live Demo](https://ai-ceo-business-intelligence-wif4-q0lkvjtjs.vercel.app/)**

The backend health endpoint is available at:

**[Backend Health Check](https://ai-ceo-backend-1ouf.onrender.com/api/health)**

---

# 🔄 Provider-Agnostic LLM Layer

The AI layer is designed to be provider-agnostic.

The current implementation uses **Groq**, while compatible providers such as:

- OpenRouter
- Together AI
- self-hosted vLLM

can be substituted through provider configuration rather than requiring application-level agent logic to be rewritten.

---

# 🚀 Getting Started

## Prerequisites

- Node.js
- npm
- Supabase project
- Groq API key
- Optional credentials for:
  - Slack
  - Jira
  - HubSpot
  - Google Gmail
  - Google Calendar

## Installation

```bash
npm install

cd server
npm install
cd ..
```

## Configuration

Create the required `.env` files using the project's `.env.example` files.

Never commit real credentials.

## Run

Start the backend using the scripts in:

```text
server/package.json
```

Then start the Vite frontend using the scripts in the root:

```text
package.json
```

---

# ☁️ Deployment

A typical deployment architecture is:

```text
GitHub
   │
   ├── Frontend → Vercel / equivalent
   │
   └── Backend  → Render / equivalent
                       │
                       ├── Supabase
                       ├── Groq
                       ├── Slack
                       ├── Jira
                       ├── HubSpot
                       └── Google
```

### Recommended deployment order

1. Deploy the backend.
2. Configure backend environment variables.
3. Deploy the frontend.
4. Set `VITE_API_URL` to the deployed backend URL.
5. Configure backend CORS for the deployed frontend.
6. Update Google OAuth redirect URIs.
7. Update Slack, Jira, and HubSpot configuration where required.
8. Test the health endpoint.
9. Test the major AI workflows.
10. Verify integration permissions before enabling production actions.

### Current Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Supabase
- **LLM inference:** Groq

**Live application:**  
[https://ai-ceo-business-intelligence-wif4-q0lkvjtjs.vercel.app/](https://ai-ceo-business-intelligence-wif4-q0lkvjtjs.vercel.app/)

**Backend:**  
[https://ai-ceo-backend-1ouf.onrender.com](https://ai-ceo-backend-1ouf.onrender.com)

---

# 🎯 Project Goal

AI CEO demonstrates how AI can move beyond passive chat and become an **auditable business decision and execution layer**.

The central loop is:

```text
Business Data
      ↓
AI Analysis
      ↓
Risk / Opportunity Detection
      ↓
Recommended Decision
      ↓
Human Approval
      ↓
Real-World Action
      ↓
Measured Outcome
      ↓
AI Evaluation & Calibration
      ↺
```

---

# 📌 Project Status

**AI CEO is an actively developed full-stack SaaS project and hackathon-ready prototype.**

It demonstrates:

- AI agent workflows
- Multi-agent reasoning
- Explainable AI
- Human-in-the-loop decision making
- Human-supervised autonomous execution
- Business intelligence
- Real-time WebSocket events
- CRM and productivity integrations
- Automated business actions
- AI evaluation and confidence calibration
- Cloud LLM inference
- Scenario simulation
- Business health monitoring

---

# 🌟 What Makes AI CEO Different?

AI CEO is built around a simple principle:

> **Don't stop at insight. Turn insight into an accountable decision and, when approved, an action.**

Instead of another chatbot or dashboard, AI CEO combines:

**Intelligence + Reasoning + Human Oversight + Execution + Measurement**

into a single business workflow.

---

## License

MIT


*Deployment configuration updated.*