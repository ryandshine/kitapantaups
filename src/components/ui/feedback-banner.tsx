import { AlertTriangle, CheckCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FeedbackBannerProps {
  type: "success" | "error" | "info"
  message: string
  onClose?: () => void
  className?: string
}

export function FeedbackBanner({ type, message, onClose, className }: FeedbackBannerProps) {
  const Icon = type === "error" ? AlertTriangle : type === "success" ? CheckCircle : Info

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        type === "success" && "border-secondary/20 bg-secondary/10 text-secondary",
        type === "error" && "border-destructive/20 bg-destructive/10 text-destructive",
        type === "info" && "border-primary/20 bg-primary/10 text-primary",
        className
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-md p-1 opacity-70 transition hover:opacity-100"
          aria-label="Tutup notifikasi"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
