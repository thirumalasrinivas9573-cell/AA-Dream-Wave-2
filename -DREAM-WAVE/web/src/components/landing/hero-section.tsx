"use client";

import { motion, useReducedMotion } from "framer-motion";

import { HeroScrollIndicator } from "@/components/landing/hero-scroll-indicator";
import { CtaButton } from "@/components/shared/cta-button";
import { APP_DESCRIPTION, APP_NAME, MARKETING_AUTH_ROUTES } from "@/constants";
import { ANIMATION_DURATION, ANIMATION_EASE } from "@/constants/animation";

const ease = ANIMATION_EASE.decelerate;

/**
 * Marketing hero — brand-led copy over a static gradient (no 3D canvas).
 */
export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : ANIMATION_DURATION.slow;
  const stagger = reduceMotion ? 0 : 0.08;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-4rem)] overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(168,85,247,0.14),transparent_50%),linear-gradient(160deg,#020617_0%,#0f172a_50%,#020617_100%)]" />
        <div className="from-background via-background/85 to-background absolute inset-0 bg-gradient-to-r via-40% max-lg:via-60%" />
        <div className="from-background/20 to-background absolute inset-0 bg-gradient-to-b via-transparent" />
      </div>

      <div className="container-app relative z-10 flex flex-1 flex-col justify-center py-16 lg:py-20">
        <div className="flex max-w-2xl flex-col gap-6">
          <motion.p
            className="text-muted-foreground text-sm font-medium tracking-[0.2em] uppercase"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, ease }}
          >
            {APP_NAME}
          </motion.p>

          <motion.h1
            id="hero-heading"
            className="text-4xl font-semibold tracking-tight text-balance max-[380px]:text-[1.75rem] sm:text-5xl lg:text-[3.15rem] lg:leading-[1.12]"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, ease, delay: stagger }}
          >
            AI-powered learning, built for real progress.
          </motion.h1>

          <motion.p
            className="text-muted-foreground max-w-xl text-base text-pretty sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, ease, delay: stagger * 2 }}
          >
            {APP_DESCRIPTION} for students, educators, and institutions — clear
            paths, intelligent guidance, and a calm, focused experience.
          </motion.p>

          <motion.div
            className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, ease, delay: stagger * 3 }}
          >
            <CtaButton
              href={MARKETING_AUTH_ROUTES.getStarted}
              variant="primary"
            >
              Get started
            </CtaButton>
            <CtaButton href="#features" variant="secondary">
              Explore platform
            </CtaButton>
          </motion.div>
        </div>
      </div>

      <HeroScrollIndicator />
    </section>
  );
}
