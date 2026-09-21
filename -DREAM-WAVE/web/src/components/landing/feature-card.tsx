import type { LandingFeature } from "@/constants/landing";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  feature: LandingFeature;
  className?: string;
};

/**
 * Data-driven feature card for the marketing features grid.
 */
export function FeatureCard({ feature, className }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <article
      className={cn(
        "border-border bg-background/60 group rounded-2xl border p-5 transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.45)]",
        "focus-within:border-foreground/20 focus-within:ring-ring focus-within:ring-2",
        "dark:hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <div className="bg-muted text-foreground group-hover:bg-foreground group-hover:text-background mb-4 inline-flex size-10 items-center justify-center rounded-xl transition-colors">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium tracking-tight">{feature.title}</h3>
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        {feature.description}
      </p>
    </article>
  );
}
