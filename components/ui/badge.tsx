import * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({ className, variant = 'default', ...props }: React.ComponentProps<'span'> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center border px-1.5 py-px font-mono text-xs font-medium tracking-wide uppercase',
        variant === 'default' && 'border-primary bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-secondary bg-secondary text-secondary-foreground',
        variant === 'destructive' && 'border-destructive bg-destructive text-background',
        variant === 'outline' && 'border-border text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
