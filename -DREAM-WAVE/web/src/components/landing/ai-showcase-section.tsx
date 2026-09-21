"use client";

import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { CtaButton } from "@/components/shared/cta-button";
import { LANDING_AI_CAPABILITIES } from "@/constants/landing";
import { MARKETING_AUTH_ROUTES } from "@/constants/navigation";

/**
 * AI showcase — capabilities grid (no 3D canvas).
 */
export function AiShowcaseSection() {
  return (
    <section
      id="ai-showcase"
      aria-labelledby="ai-showcase-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
        <ScrollReveal className="max-w-xl">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Intelligence
          </p>
          <h2
            id="ai-showcase-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            AI that supports learning — not noise
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            From mentorship to career guidance, Dream Wave’s AI layer is designed
            to feel precise, calm, and useful across mentor, teacher, resume, and
            book assistants.
          </p>
          <div className="mt-6">
            <CtaButton
              href={MARKETING_AUTH_ROUTES.getStarted}
              variant="primary"
            >
              See AI in action
            </CtaButton>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="flex flex-col gap-4">
          <div className="border-border relative min-h-48 overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12),transparent_60%)] sm:min-h-56" />

          <ul className="grid gap-3 sm:grid-cols-2">
            {LANDING_AI_CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <li key={capability.id}>
                  <article className="border-border bg-background/70 hover:border-foreground/15 focus-within:ring-ring h-full rounded-2xl border p-4 transition-[border-color,transform] duration-200 focus-within:ring-2 hover:-translate-y-0.5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-muted text-foreground inline-flex size-8 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <h3 className="text-sm font-medium tracking-tight">
                        {capability.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm text-pretty">
                      {capability.description}
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
