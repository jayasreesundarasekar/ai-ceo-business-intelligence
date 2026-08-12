interface BadgeProps {
  label: string;
  variant?: 'critical' | 'warning' | 'info' | 'success' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export default function Badge({ label, variant = 'neutral', size = 'sm', dot = false, className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    critical: 'bg-destructive/15 text-destructive border-destructive/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    info: 'bg-info/15 text-info border-info/30',
    success: 'bg-success/15 text-success border-success/30',
    neutral: 'bg-muted text-foreground-secondary border-border',
  };

  const sizes: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'critical'
              ? 'bg-destructive'
              : variant === 'warning'
                ? 'bg-warning'
                : variant === 'success'
                  ? 'bg-success'
                  : variant === 'info'
                    ? 'bg-info'
                    : 'bg-foreground-secondary'
          }`}
        />
      )}
      {label}
    </span>
  );
}
