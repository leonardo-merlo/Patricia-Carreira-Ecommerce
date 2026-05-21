import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-label-md text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:     "bg-primary text-on-primary hover:bg-primary-container rounded",
        secondary:   "bg-surface-variant text-on-surface hover:bg-surface-container-highest rounded",
        outline:     "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container rounded",
        ghost:       "text-on-surface hover:bg-surface-container rounded",
        link:        "text-primary underline-offset-4 hover:underline p-0 h-auto",
        destructive: "bg-error text-on-error hover:opacity-90 rounded",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm:      "h-8 px-4",
        lg:      "h-12 px-8",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
