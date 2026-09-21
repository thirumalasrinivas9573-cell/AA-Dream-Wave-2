import { Star } from "lucide-react";

import type { LandingTestimonial } from "@/constants/landing";
import { cn } from "@/lib/utils";

type TestimonialCardProps = {
  testimonial: LandingTestimonial;
  className?: string;
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="text-foreground flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-3.5",
            index < rating
              ? "fill-current stroke-current"
              : "fill-transparent stroke-current opacity-30",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Data-driven testimonial card for the marketing landing page.
 */
export function TestimonialCard({
  testimonial,
  className,
}: TestimonialCardProps) {
  return (
    <article
      className={cn(
        "border-border bg-background/60 flex h-full flex-col rounded-2xl border p-5 transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.45)]",
        "focus-within:ring-ring focus-within:ring-2",
        "dark:hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <RatingStars rating={testimonial.rating} />
      <blockquote className="text-foreground mt-4 flex-1 text-sm text-pretty">
        “{testimonial.quote}”
      </blockquote>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide"
          aria-hidden="true"
        >
          {testimonial.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">
            {testimonial.name}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {testimonial.role} · {testimonial.organization}
          </p>
        </div>
      </div>
    </article>
  );
}
