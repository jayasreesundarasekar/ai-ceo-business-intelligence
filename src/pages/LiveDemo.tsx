import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { useWorkflow } from '../store/WorkflowContext';
import SlackSimulator from '../components/workflow/SlackSimulator';
import ReasoningTimeline from '../components/workflow/ReasoningTimeline';
import EmailPreview from '../components/workflow/EmailPreview';
import DiscountCard from '../components/workflow/DiscountCard';
import TaskCard from '../components/workflow/TaskCard';
import WorkflowActions from '../components/workflow/WorkflowActions';
import Button from '../components/shared/Button';

export default function LiveDemo() {
  const { workflow, isProcessing, triggerWorkflow, resetWorkflow } = useWorkflow();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-scroll when workflow completes
  useEffect(() => {
    if (workflow?.status === 'completed') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      // Scroll to results after a brief delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [workflow?.status]);

  const handleSend = (message: string) => {
    triggerWorkflow(message);
  };

  const hasResults = workflow && workflow.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          >
            {Array.from({ length: 60 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50vw',
                  y: -20,
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  y: '110vh',
                  x: `calc(50vw + ${(Math.random() - 0.5) * 400}px)`,
                  scale: [0, 1, 1, 0.5],
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 2 + Math.random() * 2.5,
                  delay: Math.random() * 0.5,
                  ease: 'easeIn',
                }}
                className="absolute w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'][
                    Math.floor(Math.random() * 5)
                  ],
                  left: 0,
                  top: 0,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold font-heading text-foreground">
            AI CEO Workflow Demo
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Simulate a Slack message and watch the AI execute the full retention pipeline in real time.
          </p>
        </div>
        {hasResults && (
          <Button variant="secondary" size="sm" onClick={resetWorkflow}>
            <RotateCcw className="w-4 h-4" />
            Run Another Demo
          </Button>
        )}
      </div>

      {/* Workflow steps overview */}
      <div className="bg-background-card border border-border rounded-xl p-4">
        <p className="text-xs text-foreground-secondary font-medium mb-3 font-heading uppercase tracking-wider">
          What happens when you send the message:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { step: 1, label: 'Identify Customer', icon: '🔍' },
            { step: 2, label: 'Check History', icon: '📊' },
            { step: 3, label: 'Analyze Engagement', icon: '📉' },
            { step: 4, label: 'Draft Email', icon: '✉️' },
            { step: 5, label: 'Suggest Discount', icon: '🏷️' },
            { step: 6, label: 'Create Task', icon: '✅' },
            { step: 7, label: 'Update Dashboard', icon: '📋' },
          ].map((s) => {
            const step = workflow?.steps[s.step - 1];
            const isDone = step?.status === 'completed';
            const isRunning = step?.status === 'running';
            return (
              <div
                key={s.step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isDone
                    ? 'bg-success/10 text-success border border-success/20'
                    : isRunning
                    ? 'bg-primary/10 text-primary border border-primary/30 animate-pulse'
                    : 'bg-muted text-foreground-secondary border border-border'
                }`}
              >
                <span className="text-sm shrink-0">{s.icon}</span>
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slack Simulator */}
      {!hasResults && (
        <SlackSimulator onSend={handleSend} isProcessing={isProcessing} />
      )}

      {/* Processing state */}
      <AnimatePresence>
        {isProcessing && workflow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ReasoningTimeline steps={workflow.steps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div ref={resultsRef}>
        <AnimatePresence>
          {hasResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Completion banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="gradient-border rounded-xl"
              >
                <div className="bg-background-card rounded-xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground font-heading mb-1">
                      Workflow Complete 🎉
                    </h3>
                    <p className="text-sm text-foreground-secondary leading-relaxed">
                      The AI CEO processed the Slack message in 7 steps. It identified{' '}
                      <span className="text-foreground font-medium">{workflow.customer.company}</span> as a
                      high-value enterprise customer, drafted a personalized retention email, calculated
                      an optimal discount, and created a follow-up task — all automatically.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-foreground-secondary">
                        Completed in {((new Date(workflow.completedAt!).getTime() - new Date(workflow.startedAt!).getTime()) / 1000).toFixed(1)}s
                      </span>
                      <span className="text-xs text-foreground-secondary">·</span>
                      <span className="text-xs text-foreground-secondary">
                        Slack → {' '}
                        <a href="/" className="text-primary hover:underline inline-flex items-center gap-1">
                          View Dashboard <ExternalLink className="w-3 h-3" />
                        </a>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Reasoning timeline */}
              <ReasoningTimeline steps={workflow.steps} />

              {/* Outputs: Email + Discount + Task */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <EmailPreview
                    email={workflow.email}
                    customerName={workflow.customer.name}
                    customerEmail={workflow.customer.email}
                  />
                </div>
                <DiscountCard
                  discount={workflow.discount}
                  customerName={workflow.customer.company}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <TaskCard task={workflow.task} />
                </div>
                <div className="bg-background-card border border-border rounded-xl p-5 flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-8 h-8 text-primary mb-3" />
                  <h4 className="text-sm font-semibold text-foreground font-heading mb-1">
                    Dashboard Updated
                  </h4>
                  <p className="text-xs text-foreground-secondary mb-4 leading-relaxed">
                    The executive dashboard now shows {workflow.customer.company} as an active churn risk.
                    At-risk revenue has been recalculated.
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
                  >
                    Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Approve/Reject + real integration actions */}
              <WorkflowActions workflowRunId={workflow.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
