import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-border/40 pb-6', className)}>
      <div>
        <h1 className="text-3xl font-medium text-text-primary tracking-tight">{title}</h1>
        {description && <p className="text-sm text-text-muted mt-2 font-mono">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
