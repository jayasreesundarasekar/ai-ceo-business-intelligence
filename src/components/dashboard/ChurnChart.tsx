import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ChurnDataPoint } from '../../types';

interface ChurnChartProps {
  data: ChurnDataPoint[];
}

export default function ChurnChart({ data }: ChurnChartProps) {
  const chartData = data.map((d) => ({
    name: d.month,
    'Churn %': d.rate ?? null,
    'Predicted %': d.predicted ?? null,
    'At-Risk Accounts': d.atRisk,
  }));

  return (
    <div className="bg-background-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Churn Rate & Prediction
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive/70 inline-block" />
            <span className="text-foreground-secondary">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning/70 inline-block" />
            <span className="text-foreground-secondary">Predicted</span>
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={2}>
            <CartesianGrid stroke="oklch(0.24 0.03 260)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'oklch(0.75 0.03 260)' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'oklch(0.75 0.03 260)' }}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.17 0.02 260)',
                border: '1px solid oklch(0.32 0.03 260)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'oklch(0.93 0.01 260)',
              }}
              labelStyle={{ color: 'oklch(0.75 0.03 260)', marginBottom: 4 }}
            />
            <Bar dataKey="Churn %" radius={[4, 4, 1, 1]} maxBarSize={28}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={`actual-${idx}`}
                  fill={entry['Churn %'] != null ? 'oklch(0.577 0.215 27.33 / 0.7)' : 'transparent'}
                />
              ))}
            </Bar>
            <Bar dataKey="Predicted %" radius={[4, 4, 1, 1]} maxBarSize={28}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={`pred-${idx}`}
                  fill={entry['Predicted %'] != null ? 'oklch(0.72 0.15 75 / 0.7)' : 'transparent'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
