import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg border-2 text-sm uppercase tracking-wide min-h-10 px-4 transition-[transform,box-shadow,background-color] duration-200 ease-out active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "border-bg bg-accent-fill text-bg shadow-[4px_4px_0_var(--color-blood)] hover:bg-[#b86b1f] hover:shadow-[6px_6px_0_var(--color-blood)]",
        secondary: "border-border-strong bg-transparent text-fg hover:bg-elevated hover:shadow-[4px_4px_0_var(--color-cobalt)]",
        ghost: "border-transparent text-muted hover:text-fg hover:bg-elevated",
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
