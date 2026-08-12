interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'chart' | 'circle';
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const variants: Record<string, string> = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-xl',
    chart: 'h-64 rounded-xl',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-muted ${variants[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
