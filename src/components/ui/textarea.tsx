import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, fullWidth, ...props }, ref) => {
    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth ? "w-full" : "w-auto")}>
        {label && (
          <label className="text-sm font-semibold text-foreground/70 ml-0.5">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[96px] w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary/60 hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-destructive ml-0.5">{error}</span>}
        {helperText && !error && <span className="text-[11px] text-muted-foreground ml-0.5">{helperText}</span>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
