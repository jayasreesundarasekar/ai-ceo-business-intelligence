import { motion } from 'framer-motion';
import { Mail, User, Hash } from 'lucide-react';
import type { RetentionEmail } from '../../types';
import Button from '../shared/Button';

interface EmailPreviewProps {
  email: RetentionEmail;
  customerName: string;
  customerEmail: string;
}

export default function EmailPreview({ email, customerName, customerEmail }: EmailPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-background-card border border-border rounded-xl overflow-hidden"
    >
      {/* Email header */}
      <div className="px-5 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Mail className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground font-heading">Retention Email</p>
            <p className="text-xs text-foreground-secondary">Drafted by AI CEO</p>
          </div>
        </div>
      </div>

      {/* Email metadata */}
      <div className="px-5 py-3 space-y-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary text-xs w-16 shrink-0">From:</span>
          <span className="text-foreground text-xs">Alex Chen &lt;alex@acmesaas.com&gt;</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary text-xs w-16 shrink-0">To:</span>
          <span className="text-foreground text-xs flex items-center gap-1.5">
            <User className="w-3 h-3 text-foreground-secondary" />
            {customerName} &lt;{customerEmail}&gt;
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary text-xs w-16 shrink-0">Subject:</span>
          <span className="text-foreground text-xs font-medium">{email.subject}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary text-xs w-16 shrink-0">Tone:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-heading font-semibold uppercase tracking-wider">
            {email.tone}
          </span>
        </div>
      </div>

      {/* Email body */}
      <div className="p-5">
        <div className="bg-muted rounded-lg p-4 border border-border">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {email.body}
          </pre>
        </div>

        {/* Personalization tokens */}
        <div className="mt-4">
          <p className="text-xs text-foreground-secondary font-medium mb-2 flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            Personalization tokens used:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {email.personalizationTokens.map((token) => (
              <span
                key={token}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-heading"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs text-foreground-secondary">
          Estimated open rate: <span className="text-success font-semibold">72%</span> for personalized exec outreach
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Edit
          </Button>
          <Button variant="primary" size="sm">
            <Mail className="w-3.5 h-3.5" />
            Send Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
