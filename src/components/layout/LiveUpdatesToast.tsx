import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, AlertTriangle, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { useLiveUpdates, type LiveEvent } from '../../lib/liveUpdates';

function describeEvent(type: string, payload: unknown): { icon: typeof Zap; text: string; tone: 'default' | 'critical' } {
  const p = payload as Record<string, unknown>;
  switch (type) {
    case 'workflow.completed':
      return { icon: Zap, text: `AI decided: ${p.recommendedAction ?? 'action'} for ${p.customer ?? 'a customer'}`, tone: 'default' };
    case 'crisis.detected':
      return { icon: AlertTriangle, text: `Crisis alert: ${p.title ?? 'anomaly detected'}`, tone: 'critical' };
    case 'feedback.recorded':
      return {
        icon: p.decision === 'approved' ? ThumbsUp : ThumbsDown,
        text: `${p.decision === 'approved' ? 'Approved' : 'Rejected'}: ${p.recommendedAction ?? 'AI recommendation'}`,
        tone: 'default',
      };
    default:
      return { icon: Radio, text: type, tone: 'default' };
  }
}

/** Site-wide toast feed for WebSocket events — real-time, not polling. */
export default function LiveUpdatesToast() {
  const { events } = useLiveUpdates(10);
  const [visible, setVisible] = useState<LiveEvent[]>([]);

  useEffect(() => {
    const latest = events[0];
    if (!latest) return;
    setVisible((prev) => [latest, ...prev].slice(0, 3));
    const timer = setTimeout(() => {
      setVisible((prev) => prev.filter((e) => e !== latest));
    }, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events[0]]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
      <AnimatePresence>
        {visible.map((e) => {
          const { icon: Icon, text, tone } = describeEvent(e.type, e.payload);
          return (
            <motion.div
              key={`${e.type}-${e.at}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className={`rounded-lg border p-3 shadow-lg backdrop-blur-sm ${
                tone === 'critical' ? 'bg-destructive/15 border-destructive/40' : 'bg-background-card border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${tone === 'critical' ? 'text-destructive' : 'text-primary'}`} />
                <p className="text-xs text-foreground leading-snug">{text}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
