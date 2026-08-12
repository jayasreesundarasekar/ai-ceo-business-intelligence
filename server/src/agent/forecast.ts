import { generateJSON } from '../llm/groq.js';
import { FORECAST_SYSTEM } from './prompts.js';
import { getMonthlyRevenueHistory, getTicketVolumeTrend, getChurnRiskBreakdown } from '../db/queries.js';

export interface Forecast {
  next_month_revenue: number;
  revenue_confidence: number;
  revenue_reasoning: string;
  churn_forecast: string;
  churn_confidence: number;
  ticket_volume_forecast: string;
  cash_flow_risk: 'low' | 'medium' | 'high';
  cash_flow_reasoning: string;
}

/**
 * Reasoned forecast, not a trained ML model. Honest scope note: we don't
 * have HR/headcount data in this schema, so we don't attempt an "employee
 * burnout" prediction — that would just be fabricating numbers. Everything
 * returned here is grounded in real revenue, churn, and ticket-volume rows.
 */
export async function generateForecast(): Promise<Forecast> {
  const [revenue, tickets, churn] = await Promise.all([
    getMonthlyRevenueHistory(),
    getTicketVolumeTrend(),
    getChurnRiskBreakdown(),
  ]);

  return generateJSON<Forecast>(
    FORECAST_SYSTEM,
    `Monthly revenue history: ${JSON.stringify(revenue)}\nMonthly support ticket volume: ${JSON.stringify(tickets)}\nMonthly churn-risk breakdown: ${JSON.stringify(churn)}`
  );
}
