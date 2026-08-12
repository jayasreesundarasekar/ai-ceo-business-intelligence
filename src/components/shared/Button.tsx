import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring] active:scale-[0.97]';

  const variants: Record<string, string> = {
    primary:
      'bg-primary text-on-primary hover:opacity-90 hover:-translate-y-px shadow-sm',
    secondary:
      'bg-muted text-foreground border border-border hover:bg-muted-hover hover:border-border-strong',
    ghost: 'text-foreground-secondary hover:bg-muted hover:text-foreground',
    destructive: 'bg-destructive text-white hover:opacity-90',
  };

  const sizes: Record<string, string> = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}
