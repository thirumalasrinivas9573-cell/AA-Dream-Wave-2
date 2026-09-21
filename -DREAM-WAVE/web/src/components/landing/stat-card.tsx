"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { LandingStat } from "@/constants/landing";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/number";

type StatCardProps = {
  stat: LandingStat;
  className?: string;
};

function formatStatValue(value: number): string {
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, "en-US", {
      maximumFractionDigits: 0,
    })}M`;
  }
  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, "en-US", {
      maximumFractionDigits: value >= 10_000 ? 0 : 1,
    })}k`;
  }
  return formatNumber(value);
}

/**
 * Statistic display with optional in-view count-up (disabled for reduced motion).
 */
export function StatCard({ stat, className }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const finalValue = formatStatValue(stat.value);
  const [display, setDisplay] = useState(finalValue);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    if (reduceMotion) {
      return;
    }

    let frame = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || started) {
          return;
        }
        started = true;
        observer.disconnect();

        const durationMs = 900;
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          const eased = 1 - (1 - progress) ** 3;
          const current = Math.round(stat.value * eased);
          setDisplay(formatStatValue(current));
          if (progress < 1) {
            frame = requestAnimationFrame(tick);
          }
        };

        setDisplay(formatStatValue(0));
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [finalValue, reduceMotion, stat.value]);

  return (
    <div
      ref={ref}
      className={cn(
        "border-border bg-background/50 rounded-2xl border px-4 py-5 sm:px-5",
        className,
      )}
    >
      <dt className="text-muted-foreground text-sm">{stat.label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        <span aria-hidden="true">
          {stat.prefix}
          {display}
          {stat.suffix}
        </span>
        <span className="sr-only">
          {stat.prefix}
          {finalValue}
          {stat.suffix} {stat.label}
        </span>
      </dd>
    </div>
  );
}
