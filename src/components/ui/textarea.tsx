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
          <label className="ml-0.5 text-[0.82rem] font-semibold text-foreground/72">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[88px] w-full rounded-xl border border-border/80 bg-background/88 px-3 py-2.5 text-[0.92rem] text-foreground transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary/60 hover:border-border disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="ml-0.5 text-[10px] font-medium text-destructive">{error}</span>}
        {helperText && !error && <span className="ml-0.5 text-[10px] leading-relaxed text-muted-foreground">{helperText}</span>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
