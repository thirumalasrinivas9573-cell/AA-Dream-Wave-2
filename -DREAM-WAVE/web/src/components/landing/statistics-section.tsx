import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { StatCard } from "@/components/landing/stat-card";
import { LANDING_STATS } from "@/constants/landing";

/**
 * Statistics section — platform impact metrics.
 */
export function StatisticsSection() {
  return (
    <section
      id="statistics"
      aria-labelledby="statistics-heading"
      className="border-border bg-muted/20 border-t py-20 sm:py-24"
    >
      <div className="container-app">
        <ScrollReveal className="max-w-2xl">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Impact
          </p>
          <h2
            id="statistics-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Built for scale across learning communities
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Indicative scale across learners, programs, institutions, partners,
            and AI-supported sessions on Dream Wave.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.06}>
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {LANDING_STATS.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </dl>
        </ScrollReveal>
      </div>
    </section>
  );
}
