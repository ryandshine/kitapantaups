import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, helperText, error, leftIcon, rightIcon, fullWidth, ...props }, ref) => {
    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth ? "w-full" : "w-auto")}>
        {label && (
          <label className="ml-0.5 text-[0.82rem] font-semibold text-foreground/72">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
            <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-xl border border-border/80 bg-background/88 px-3 py-2 text-[0.92rem] text-foreground transition-all duration-200 file:border-0 file:bg-transparent file:text-[0.92rem] file:font-medium placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary/60 hover:border-border disabled:cursor-not-allowed disabled:opacity-50 autofill:text-foreground [-webkit-text-fill-color:hsl(var(--foreground))] [caret-color:hsl(var(--foreground))] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_hsl(var(--background))] [&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill:hover]:[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill:focus]:[-webkit-text-fill-color:hsl(var(--foreground))]",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-muted-foreground flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="ml-0.5 text-[10px] font-medium text-destructive">{error}</span>}
        {helperText && !error && <span className="ml-0.5 text-[10px] leading-relaxed text-muted-foreground">{helperText}</span>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
