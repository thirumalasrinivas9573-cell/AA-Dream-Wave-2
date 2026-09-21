import { BadgeCheck, type LucideIcon,Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { INSTITUTION_TYPE_LABELS } from "@/constants/institution-directory";
import { cn } from "@/lib/utils";
import type { InstitutionType } from "@/types/institution-discovery";

export function RatingStars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const rounded = Math.round(value);
  const starClass = size === "md" ? "size-5" : "size-4";
  return (
    <span className="flex items-center gap-1.5" aria-label={`Rated ${value} out of 5`}>
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              starClass,
              index < rounded
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined ? (
        <span className="text-muted-foreground text-xs">({count.toLocaleString()})</span>
      ) : null}
    </span>
  );
}

export function VerificationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Verified
    </span>
  );
}

export function TypeBadge({ type }: { type: InstitutionType }) {
  return <Badge variant="muted">{INSTITUTION_TYPE_LABELS[type]}</Badge>;
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-border bg-card/60 rounded-xl border p-4 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs font-medium">{label}</p>
      {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
    </div>
  );
}

export function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function LogoBadge({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-10 text-sm",
    md: "size-14 text-lg",
    lg: "size-20 text-2xl",
  } as const;
  return (
    <span
      className={cn(
        "from-primary/20 to-primary/5 text-primary border-primary/20 flex shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br font-bold",
        sizes[size],
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function DiscoverySection({
  id,
  title,
  description,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
