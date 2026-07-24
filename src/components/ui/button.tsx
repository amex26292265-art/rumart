import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-accent-600 to-accent-500 text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:from-accent-500 hover:to-accent-400",
        accent: "bg-accent-500 text-white hover:bg-accent-400 glow-accent",
        outline:
          "border border-mist-300 bg-mist-100/60 text-ink-900 hover:border-accent-500/50 hover:bg-mist-200/80 hover:text-ink-950",
        ghost: "text-ink-700 hover:bg-mist-200 hover:text-ink-950",
        subtle: "bg-mist-200 text-ink-900 hover:bg-mist-300",
      },
      size: {
        sm: "h-8 px-3.5",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
