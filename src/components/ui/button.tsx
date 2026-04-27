import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[0.92rem] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md",
                primary: // Alias for default
                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92 hover:shadow-md",
                outline:
                    "border border-border bg-card text-foreground shadow-sm hover:border-primary/20 hover:bg-accent/60 hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/88 hover:shadow-md",
                ghost: "hover:bg-accent/70 hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-3.5 py-2",
                sm: "h-8 px-3 text-[0.78rem]",
                lg: "h-10 px-6 text-[0.95rem]",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, isLoading, leftIcon, rightIcon, fullWidth, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }), fullWidth && "w-full")}
                ref={ref}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && <Loader2 className="animate-spin" />}
                {!isLoading && leftIcon && leftIcon}
                {children}
                {!isLoading && rightIcon && rightIcon}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
