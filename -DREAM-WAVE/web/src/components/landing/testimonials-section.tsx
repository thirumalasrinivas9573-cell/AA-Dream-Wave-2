import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { TestimonialCard } from "@/components/landing/testimonial-card";
import { LANDING_TESTIMONIALS } from "@/constants/landing";

/**
 * Testimonials section — social proof stories.
 */
export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Stories
          </p>
          <h2
            id="testimonials-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Trusted by learners, educators, and teams
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Clarity, calm guidance, and outcomes that feel intentional — the
            Dream Wave experience across learners, educators, and teams.
          </p>
        </ScrollReveal>

        <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
          {LANDING_TESTIMONIALS.map((testimonial, index) => (
            <li key={testimonial.id}>
              <ScrollReveal delay={Math.min(index * 0.05, 0.15)}>
                <TestimonialCard testimonial={testimonial} />
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
