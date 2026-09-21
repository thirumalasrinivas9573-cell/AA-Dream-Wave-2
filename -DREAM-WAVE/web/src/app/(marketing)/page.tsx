import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { FeaturesPreviewSection } from "@/components/landing/features-preview-section";
import { HeroSection } from "@/components/landing/hero-section";
import { APP_DESCRIPTION } from "@/constants";

const PlatformOverviewSection = dynamic(
  () =>
    import("@/components/landing/marketing-sections").then(
      (mod) => mod.PlatformOverviewSection,
    ),
);

const AiShowcaseSection = dynamic(
  () =>
    import("@/components/landing/ai-showcase-section").then(
      (mod) => mod.AiShowcaseSection,
    ),
);

const StatisticsSection = dynamic(
  () =>
    import("@/components/landing/statistics-section").then(
      (mod) => mod.StatisticsSection,
    ),
);

const TestimonialsSection = dynamic(
  () =>
    import("@/components/landing/testimonials-section").then(
      (mod) => mod.TestimonialsSection,
    ),
);

const PricingSection = dynamic(
  () =>
    import("@/components/landing/marketing-sections").then(
      (mod) => mod.PricingSection,
    ),
);

const FaqSection = dynamic(
  () =>
    import("@/components/landing/marketing-sections").then(
      (mod) => mod.FaqSection,
    ),
);

const ContactSection = dynamic(
  () =>
    import("@/components/landing/marketing-sections").then(
      (mod) => mod.ContactSection,
    ),
);

const CtaSection = dynamic(
  () =>
    import("@/components/landing/cta-section").then((mod) => mod.CtaSection),
);

export const metadata: Metadata = {
  title: "Home",
  description: APP_DESCRIPTION,
};

/**
 * Dream Wave marketing landing page — hero + features eager; rest split.
 */
export default function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <HeroSection />
      <FeaturesPreviewSection />
      <PlatformOverviewSection />
      <AiShowcaseSection />
      <StatisticsSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <ContactSection />
      <CtaSection />
    </main>
  );
}
