import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-label-md text-caption px-2.5 py-0.5 transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary text-on-primary",
        secondary:   "bg-surface-variant text-on-surface-variant",
        outline:     "border border-outline-variant text-on-surface bg-transparent",
        tertiary:    "bg-tertiary text-on-tertiary",
        destructive: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
