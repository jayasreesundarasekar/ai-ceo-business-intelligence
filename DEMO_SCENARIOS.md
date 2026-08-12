# Demo Scenarios

A suggested 5-minute walkthrough, plus the individual scenarios wired into the app for quick access.

## Suggested narrative (matches the "good morning" pitch)

1. **Command Center** (`/command-center`) — open here. Live company health score, any
   active crisis alerts, MRR, open tasks, recent agent activity — the "what happened
   overnight" view.
2. **Live Demo** (`/live-demo`) — pick a preset Slack message (see below) and send it.
   Watch the 7-step reasoning trail run in real time, then **Approve** the recommendation
   and fire one of the real integration buttons (Jira / Gmail / Calendar / HubSpot).
3. **Insights** (`/insights`) — open a card and click **Why?** to show the confidence
   meter + data sources consulted (Explainable AI).
4. **Simulator** (`/simulator`) — run "What happens if we give a 20% discount to all
   premium customers?" to show grounded what-if planning.
5. **Debate** (`/debate`) — run a pricing or discount question and show Sales/Finance/
   Support genuinely disagreeing before the CEO agent decides.
6. **Evaluation** (`/evaluation`) — close on the self-measurement page: decisions made,
   acceptance rate, revenue protected, confidence calibration. This is the "it isn't just
   making recommendations, it's measuring its own effectiveness" beat.

Run `npm run db:setup` in `server/` first so all of the above have real historical data
to show instead of empty states.

## Preset scenarios (also available as one-click buttons in Live Demo)

| Scenario | Slack message | What it exercises |
|---|---|---|
| Cancel Request | "Customer XYZ is unhappy and wants to cancel. Can we do something?" | Churn detection → retention discount → task |
| Churn Signal | "GlobalTech Solutions just sent a termination notice. Losing them would hurt." | Critical risk path, higher discount |
| Angry Ticket Spike | "Support just flagged 4 angry tickets from Nimbus Retail in the last hour, mostly about the new billing UI. They're a top-20 account." | Crisis Detection correlating with a live workflow run |
| Upsell Signal | "Bright Path Media has been hitting their seat limit for 3 weeks straight and keeps asking about the enterprise plan." | Non-churn path — the agent should recommend an upsell conversation, not a discount |
| Renewal Question | "Finance at Meridian Labs is asking what happens to pricing if they renew a year early — sounds like they want a deal." | Negotiation/pricing reasoning distinct from churn |

## Other tools worth demoing individually

- **Strategy Mode** (`/strategy`): "How can we grow revenue by 20% next quarter?"
- **Meeting Companion** (`/meeting`): paste any rough meeting notes — the placeholder
  text in the textarea is itself a ready-to-run example.
- **Memory Graph** (`/memory-graph`): shows customers linked to their AI decisions,
  tasks, and tickets — best after `db:setup` has run so there's enough graph density.
- **Reports** (`/reports`): generate a real PDF weekly executive report.
