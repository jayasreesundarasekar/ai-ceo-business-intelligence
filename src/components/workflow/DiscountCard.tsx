import { motion } from 'framer-motion';
import { Percent, TrendingUp, Clock, ShieldCheck } from 'lucide-react';
import type { DiscountOffer } from '../../types';
import Button from '../shared/Button';

interface DiscountCardProps {
  discount: DiscountOffer;
  customerName: string;
}

export default function DiscountCard({ discount, customerName }: DiscountCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      className="bg-background-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
            <Percent className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground font-heading">Retention Discount</p>
            <p className="text-xs text-foreground-secondary">AI-calculated optimal offer</p>
          </div>
        </div>
      </div>

      {/* Hero value */}
      <div className="px-5 py-6 text-center border-b border-border">
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          <span className="text-5xl font-bold text-success font-heading tracking-tight">
            {discount.value}%
          </span>
          <span className="text-lg text-foreground-secondary font-heading">OFF</span>
        </div>
        <p className="text-sm font-semibold text-foreground">{discount.description}</p>
        <p className="text-xs text-foreground-secondary mt-1">
          For {customerName} · Expires in {discount.expiresInDays} days
        </p>
      </div>

      {/* Metrics */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-border">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] text-foreground-secondary font-heading uppercase tracking-wider">ROI</span>
          </div>
          <p className="text-lg font-bold text-foreground font-heading">5.3×</p>
          <p className="text-[10px] text-foreground-secondary">if retained 1 year</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-info" />
            <span className="text-[10px] text-foreground-secondary font-heading uppercase tracking-wider">Confidence</span>
          </div>
          <p className="text-lg font-bold text-foreground font-heading">High</p>
          <p className="text-[10px] text-foreground-secondary">optimal range: 20–30%</p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="px-5 py-4">
        <p className="text-xs text-foreground-secondary font-medium mb-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Why this discount?
        </p>
        <p className="text-sm text-foreground leading-relaxed">{discount.reason}</p>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm">
          Adjust
        </Button>
        <Button variant="primary" size="sm">
          <Percent className="w-3.5 h-3.5" />
          Apply Discount
        </Button>
      </div>
    </motion.div>
  );
}
