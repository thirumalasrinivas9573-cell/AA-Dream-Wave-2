"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { ANIMATION_DURATION, ANIMATION_EASE } from "@/constants/animation";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * Lightweight once-per-view fade/rise for landing sections.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: reduceMotion ? 0 : ANIMATION_DURATION.slow,
        delay: reduceMotion ? 0 : delay,
        ease: ANIMATION_EASE.decelerate,
      }}
    >
      {children}
    </motion.div>
  );
}
