import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { CtaButton } from "@/components/shared/cta-button";
import { MARKETING_AUTH_ROUTES } from "@/constants";

/**
 * Final conversion CTA — encourages starting the Dream Wave journey.
 */
export function CtaSection() {
  return (
    <section
      id="cta"
      aria-labelledby="cta-heading"
      className="border-border relative isolate overflow-hidden border-t py-20 sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="from-muted/50 via-background to-background absolute inset-0 bg-gradient-to-b" />
        <div className="bg-foreground/[0.03] absolute inset-x-0 top-1/2 mx-auto h-64 w-[min(100%,40rem)] -translate-y-1/2 rounded-full blur-3xl" />
      </div>

      <div className="container-app">
        <ScrollReveal className="mx-auto flex max-w-2xl flex-col items-start gap-6 sm:items-center sm:text-center">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Begin
          </p>
          <h2
            id="cta-heading"
            className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl"
          >
            Start your Dream Wave journey
          </h2>
          <p className="text-muted-foreground text-sm text-pretty sm:text-base">
            Create an account to explore adaptive learning, AI mentorship, and a
            calmer path from curiosity to capability.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <CtaButton
              href={MARKETING_AUTH_ROUTES.getStarted}
              variant="primary"
            >
              Get started free
            </CtaButton>
            <CtaButton href={MARKETING_AUTH_ROUTES.login} variant="secondary">
              Log in
            </CtaButton>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
