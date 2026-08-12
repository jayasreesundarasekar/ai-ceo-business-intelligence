import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertTriangle, User, ArrowUpRight } from 'lucide-react';
import type { FollowUpTask } from '../../types';
import Button from '../shared/Button';

interface TaskCardProps {
  task: FollowUpTask;
}

const priorityConfig = {
  high: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'HIGH PRIORITY' },
  medium: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'MEDIUM PRIORITY' },
  low: { icon: CheckSquare, color: 'text-info', bg: 'bg-info/10', label: 'LOW PRIORITY' },
};

export default function TaskCard({ task }: TaskCardProps) {
  const pc = priorityConfig[task.priority];
  const PriorityIcon = pc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.16 }}
      className="bg-background-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground font-heading">Follow-up Task</p>
            <p className="text-xs text-foreground-secondary">Auto-created by AI CEO</p>
          </div>
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-heading font-semibold uppercase tracking-wider ${pc.bg} ${pc.color}`}>
            <PriorityIcon className="w-3 h-3" />
            {pc.label}
          </span>
        </div>
      </div>

      {/* Task details */}
      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground font-heading mb-2">{task.title}</h4>
          <p className="text-sm text-foreground-secondary leading-relaxed">{task.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5 text-foreground-secondary" />
              <span className="text-[10px] text-foreground-secondary font-heading uppercase tracking-wider">Assignee</span>
            </div>
            <p className="text-sm font-medium text-foreground">{task.assignee}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] text-foreground-secondary font-heading uppercase tracking-wider">Due In</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {task.dueInHours} hours
              <span className="text-xs text-foreground-secondary ml-1">
                ({Math.ceil(task.dueInHours / 24)}d SLA)
              </span>
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-heading font-semibold ${
            task.status === 'open'
              ? 'bg-warning/10 text-warning'
              : task.status === 'in_progress'
              ? 'bg-info/10 text-info'
              : 'bg-success/10 text-success'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              task.status === 'open' ? 'bg-warning' : task.status === 'in_progress' ? 'bg-info' : 'bg-success'
            }`} />
            {task.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs text-foreground-secondary">
            Created {new Date(task.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs text-foreground-secondary">
          Escalation: if no response in 5 days → <span className="text-destructive font-medium">CEO</span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Reassign
          </Button>
          <Button variant="primary" size="sm">
            <ArrowUpRight className="w-3.5 h-3.5" />
            View Task
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
