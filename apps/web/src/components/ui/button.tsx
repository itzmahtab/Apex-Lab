import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors min-h-10 px-4 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent-fill text-white hover:bg-[#c4271b]",
        secondary: "bg-elevated text-fg border border-border hover:border-border-strong hover:bg-[#1f2430]",
        ghost: "text-muted hover:text-fg hover:bg-elevated",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);
type V = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & V) {
  return <button className={cn(buttonVariants({ variant }), className)} {...p} />;
}
export function LinkButton({ className, variant, href, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & V & { href: string }) {
  return <Link href={href} className={cn(buttonVariants({ variant }), className)} {...p} />;
}
