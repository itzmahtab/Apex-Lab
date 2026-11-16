"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export const FadeIn = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, ease: "easeOut" }}>
    {children}
  </motion.div>
);
