"use client";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** reducedMotion="user" disables transform/layout animation when the OS asks for reduced motion. */
export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
