import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
        success: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15",
        warning: "border-accent/30 bg-accent/12 text-accent hover:bg-accent/20",
        info: "border-secondary/30 bg-secondary/12 text-secondary hover:bg-secondary/20",
        gray: "border-border bg-muted text-muted-foreground hover:bg-muted/80",
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

export const formatStatusLabel = (status?: string) => {
  const normalized = (status || '').toLowerCase().trim();
  if (!normalized) return '-';
  if (normalized === 'baru') return 'Baru';
  if (normalized === 'proses') return 'Proses Penanganan';
  if (normalized === 'menunggu_tanggapan') return 'Menunggu Tanggapan';
  if (normalized === 'selesai') return 'Selesai';
  if (normalized === 'ditolak') return 'Ditolak';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Custom Helpers
export const StatusBadge = ({ status, className }: { status: string, className?: string }) => {
  let variant: BadgeProps['variant'] = 'gray';

  const s = (status || '').toLowerCase();

  if (['selesai', 'diterima', 'terverifikasi'].includes(s)) variant = 'success';
  else if (['proses', 'tindak_lanjut'].includes(s)) variant = 'info';
  else if (['menunggu_tanggapan'].includes(s)) variant = 'warning';
  else if (['ditolak', 'dibatalkan', 'masalah'].includes(s)) variant = 'destructive';
  else if (['baru', 'draft', 'pending'].includes(s)) variant = 'warning';

  return (
    <Badge variant={variant} className={cn("uppercase tracking-wider font-bold", className)}>
      {formatStatusLabel(status)}
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
