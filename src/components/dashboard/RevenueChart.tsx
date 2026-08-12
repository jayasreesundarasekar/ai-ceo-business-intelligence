import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { RevenueDataPoint } from '../../types';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    'Revenue ($K)': d.revenue ? Math.round(d.revenue / 1000) : null,
    'Predicted ($K)': d.predicted ? Math.round(d.predicted / 1000) : null,
  }));

  return (
    <div className="bg-background-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Revenue Trend
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-primary inline-block" />
            <span className="text-foreground-secondary">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-accent inline-block opacity-60" style={{ borderTop: '2px dashed var(--color-accent)' }} />
            <span className="text-foreground-secondary">Predicted</span>
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid stroke="oklch(0.24 0.03 260)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'oklch(0.75 0.03 260)' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'oklch(0.75 0.03 260)' }}
              tickFormatter={(v) => `$${v}K`}
              width={55}
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
            <Line
              type="monotone"
              dataKey="Revenue ($K)"
              stroke="oklch(0.62 0.19 260)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'oklch(0.62 0.19 260)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'oklch(0.62 0.19 260)', strokeWidth: 2, stroke: 'oklch(0.13 0.02 260)' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Predicted ($K)"
              stroke="oklch(0.75 0.16 70)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: 'oklch(0.75 0.16 70)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'oklch(0.75 0.16 70)', strokeWidth: 2, stroke: 'oklch(0.13 0.02 260)' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
