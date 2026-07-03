import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/15 text-primary border-primary/25',
        secondary:
          'border-border bg-secondary text-secondary-foreground',
        outline: 'text-foreground border-border',
        success:
          'bg-ok-bg text-ok border-ok/25',
        warning:
          'bg-warn-bg text-warn border-warn/25',
        destructive:
          'bg-bad-bg text-bad border-bad/25',
        accent:
          'border-transparent bg-accent/15 text-accent border-accent/25',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
