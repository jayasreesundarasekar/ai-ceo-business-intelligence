import { motion } from 'framer-motion';
import {
  Search,
  Receipt,
  Activity,
  Mail,
  Percent,
  CheckSquare,
  BarChart3,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { AIReasoningStep } from '../../types';

const iconMap: Record<string, typeof Search> = {
  Search,
  Receipt,
  Activity,
  Mail,
  Percent,
  CheckSquare,
  BarChart3,
};

interface ReasoningTimelineProps {
  steps: AIReasoningStep[];
}

function StepCard({ step, index }: { step: AIReasoningStep; index: number }) {
  const Icon = iconMap[step.icon] || Search;
  const isRunning = step.status === 'running';
  const isCompleted = step.status === 'completed';
  const isPending = step.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`relative pl-10 pb-6 last:pb-0 ${
        isPending ? 'opacity-40' : ''
      }`}
    >
      {/* Vertical line */}
      {index < 6 && (
        <div
          className={`absolute left-[15px] top-10 bottom-0 w-px transition-colors duration-300 ${
            isCompleted ? 'bg-primary/50' : 'bg-border'
          }`}
        />
      )}

      {/* Node */}
      <div
        className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
          isCompleted
            ? 'bg-primary/15 border-primary'
            : isRunning
            ? 'bg-primary/10 border-primary animate-pulse'
            : 'bg-muted border-border'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : isRunning ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Icon className="w-3.5 h-3.5 text-foreground-secondary" />
        )}
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-heading font-semibold text-foreground-secondary">
            STEP {step.stepNumber}
          </span>
          <span
            className={`text-[10px] font-heading uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
              isCompleted
                ? 'bg-success/15 text-success'
                : isRunning
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-foreground-secondary'
            }`}
          >
            {isCompleted ? 'DONE' : isRunning ? 'RUNNING' : 'QUEUED'}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-foreground font-heading mb-2">
          {step.title}
        </h4>

        {(isRunning || isCompleted) && step.reasoning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.25 }}
            className="bg-muted rounded-lg p-3 border border-border mb-2"
          >
            <pre className="text-xs text-foreground-secondary whitespace-pre-wrap font-mono leading-relaxed">
              {step.reasoning}
            </pre>
          </motion.div>
        )}

        {isCompleted && step.conclusion && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-sm text-foreground bg-success/5 rounded-lg px-3 py-2 border border-success/15"
          >
            {step.conclusion}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

export default function ReasoningTimeline({ steps }: ReasoningTimelineProps) {
  const activeSteps = steps.filter((s) => s.status !== 'pending');
  const allPending = steps.every((s) => s.status === 'pending');

  if (allPending) {
    return (
      <div className="bg-background-card border border-border rounded-xl p-6 text-center">
        <BarChart3 className="w-8 h-8 text-foreground-secondary mx-auto mb-3 opacity-40" />
        <p className="text-sm text-foreground-secondary font-medium">
          AI reasoning will appear here once the workflow starts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground font-heading mb-5 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        AI Reasoning — Step by Step
      </h3>
      <div>
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}
