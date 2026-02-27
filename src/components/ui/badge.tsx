import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Status variants
        success: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning: "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
        info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
        gray: "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Custom Helpers
export const StatusBadge = ({ status, className }: { status: string, className?: string }) => {
  let variant: BadgeProps['variant'] = 'gray';

  const s = (status || '').toLowerCase();

  if (['selesai', 'diterima', 'terverifikasi'].includes(s)) variant = 'success';
  else if (['proses', 'tindak_lanjut'].includes(s)) variant = 'info';
  else if (['ditolak', 'dibatalkan', 'masalah'].includes(s)) variant = 'destructive';
  else if (['baru', 'draft', 'pending'].includes(s)) variant = 'warning';

  return (
    <Badge variant={variant} className={cn("uppercase tracking-wider font-bold", className)}>
      {status}
    </Badge>
  );
};

export const SkemaBadge = ({ skema, className }: { skema: string, className?: string }) => {
  // Generate color based on skema string hash or predefined map
  const colors: Record<string, BadgeProps['variant']> = {
    'HD': 'success',
    'HKm': 'info',
    'HTR': 'warning',
    'Hutan Adat': 'secondary',
    'Kulin KK': 'outline'
  };

  const variant = colors[skema] || 'outline';

  return (
    <Badge variant={variant} className={className}>
      {skema}
    </Badge>
  );
};


export { Badge, badgeVariants }
