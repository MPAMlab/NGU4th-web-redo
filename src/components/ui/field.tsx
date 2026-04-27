import * as React from "react"
import { cn } from "@/lib/utils"

const Field = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5", className)} {...props} />
)

const FieldGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-wrap gap-4", className)} {...props} />
)

const FieldLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "text-xs font-black uppercase tracking-widest text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
)

export { Field, FieldGroup, FieldLabel }
