"use client";

import { motion, useReducedMotion } from "framer-motion";

import { ANIMATION_DURATION } from "@/constants/animation";

/**
 * Subtle scroll cue for the hero — hidden when reduced motion is preferred.
 */
export function HeroScrollIndicator() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return null;
  }

  return (
    <motion.a
      href="#features"
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md px-3 py-2 text-xs tracking-[0.16em] uppercase focus-visible:ring-2 focus-visible:outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: 0.8,
        duration: ANIMATION_DURATION.slow,
      }}
      aria-label="Scroll to features"
    >
      <span>Scroll</span>
      <motion.span
        className="border-muted-foreground/50 block h-8 w-px origin-top bg-current"
        animate={{ scaleY: [1, 0.45, 1], opacity: [0.35, 1, 0.35] }}
        transition={{
          duration: 1.6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        aria-hidden="true"
      />
    </motion.a>
  );
}
