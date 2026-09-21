import { FeatureCard } from "@/components/landing/feature-card";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { LANDING_FEATURES } from "@/constants/landing";

/**
 * Features section — why Dream Wave, data-driven capability grid.
 */
export function FeaturesPreviewSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Platform
          </p>
          <h2
            id="features-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Built for clarity, progress, and trust
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Dream Wave brings adaptive learning, AI guidance, and institutional
            rigor into one calm experience — so every learner knows what to do
            next, and every educator can see what matters.
          </p>
        </ScrollReveal>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {LANDING_FEATURES.map((feature, index) => (
            <li key={feature.id}>
              <ScrollReveal delay={Math.min(index * 0.05, 0.2)}>
                <FeatureCard feature={feature} />
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
