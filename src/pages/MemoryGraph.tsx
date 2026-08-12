import { useEffect, useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { api, type MemoryGraph as MemoryGraphData, type GraphNode } from '../lib/api';

const typeColor: Record<GraphNode['type'], string> = {
  customer: 'oklch(0.62 0.19 260)', // primary
  decision: 'oklch(0.577 0.215 27.33)', // destructive-ish
  task: 'oklch(0.72 0.17 155)', // success-ish
  ticket: 'oklch(0.72 0.15 75)', // warning-ish
};

const typeLabel: Record<GraphNode['type'], string> = {
  customer: 'Customer',
  decision: 'AI Decision',
  task: 'Task',
  ticket: 'Ticket',
};

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

function layout(data: MemoryGraphData, width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const customerRadius = Math.min(width, height) * 0.34;

  const customers = data.nodes.filter((n) => n.type === 'customer');
  const positions = new Map<string, PositionedNode>();

  customers.forEach((c, i) => {
    const angle = (i / Math.max(customers.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions.set(c.id, { ...c, x: cx + customerRadius * Math.cos(angle), y: cy + customerRadius * Math.sin(angle) });
  });

  // Satellite nodes cluster tightly around their customer.
  const byCustomer = new Map<string, GraphNode[]>();
  for (const e of data.edges) {
    if (!positions.has(e.source)) continue;
    const list = byCustomer.get(e.source) ?? [];
    const node = data.nodes.find((n) => n.id === e.target);
    if (node) list.push(node);
    byCustomer.set(e.source, list);
  }

  for (const [customerId, satellites] of byCustomer.entries()) {
    const center = positions.get(customerId)!;
    const satRadius = 70;
    satellites.forEach((s, i) => {
      const angle = (i / Math.max(satellites.length, 1)) * Math.PI * 2;
      positions.set(s.id, { ...s, x: center.x + satRadius * Math.cos(angle), y: center.y + satRadius * Math.sin(angle) });
    });
  }

  return positions;
}

export default function MemoryGraph() {
  const [data, setData] = useState<MemoryGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMemoryGraph()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const width = 900;
  const height = 620;
  const positions = useMemo(() => (data ? layout(data, width, height) : new Map<string, PositionedNode>()), [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-heading text-foreground flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          Business Memory Graph
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Customers, AI decisions, tasks, and tickets linked as a knowledge graph — how the AI connects
          information about an account over time, instead of flat chat history.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          Couldn't reach the backend ({error}). Is it running? See server/README.md.
        </div>
      )}

      <div className="flex items-center gap-4 text-xs">
        {(Object.keys(typeColor) as GraphNode['type'][]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: typeColor[t] }} />
            <span className="text-foreground-secondary">{typeLabel[t]}</span>
          </span>
        ))}
      </div>

      <div className="bg-background-card border border-border rounded-xl p-2 overflow-x-auto">
        {loading ? (
          <div className="h-[620px] rounded-lg bg-muted animate-pulse" />
        ) : !data || data.nodes.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center px-6">
            <Network className="w-10 h-10 text-foreground-secondary mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1 font-heading">Nothing to graph yet</p>
            <p className="text-xs text-foreground-secondary">
              Trigger a workflow from Live Demo to start building customer memory.
            </p>
          </div>
        ) : (
          <svg width={width} height={height} className="mx-auto">
            {data.edges.map((e, i) => {
              const s = positions.get(e.source);
              const t = positions.get(e.target);
              if (!s || !t) return null;
              const dimmed = hovered && hovered !== e.source && hovered !== e.target;
              return (
                <line
                  key={i}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="oklch(0.32 0.03 260)"
                  strokeWidth={1}
                  opacity={dimmed ? 0.15 : 0.6}
                />
              );
            })}
            {Array.from(positions.values()).map((n) => {
              const isCustomer = n.type === 'customer';
              const dimmed = hovered && hovered !== n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  opacity={dimmed ? 0.35 : 1}
                  className="cursor-pointer"
                >
                  <circle r={isCustomer ? 8 : 5} fill={typeColor[n.type]} stroke="oklch(0.13 0.02 260)" strokeWidth={2} />
                  <title>
                    {typeLabel[n.type]}: {n.label} {n.detail ? `(${n.detail})` : ''}
                  </title>
                  <text
                    y={isCustomer ? -14 : -10}
                    textAnchor="middle"
                    fontSize={isCustomer ? 11 : 9}
                    fill={isCustomer ? 'oklch(0.93 0.01 260)' : 'oklch(0.75 0.03 260)'}
                    fontWeight={isCustomer ? 600 : 400}
                  >
                    {n.label.length > 22 ? `${n.label.slice(0, 22)}…` : n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
