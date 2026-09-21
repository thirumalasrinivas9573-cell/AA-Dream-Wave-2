import { Award, Briefcase, MapPin, Wallet } from "lucide-react";
import Link from "next/link";

import {
  LogoBadge,
  RatingStars,
  TypeBadge,
  VerificationBadge,
} from "@/components/discovery/discovery-ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DISCOVERY_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { InstitutionProfile } from "@/types/institution-discovery";

export function InstitutionCard({
  institution,
  selected = false,
  onToggleSelect,
  selectDisabled = false,
}: {
  institution: InstitutionProfile;
  selected?: boolean;
  onToggleSelect?: (slug: string) => void;
  selectDisabled?: boolean;
}) {
  return (
    <Card
      interactive
      padding="none"
      className="flex min-w-0 flex-col overflow-hidden"
    >
      <div className="from-primary/15 via-primary/5 to-background relative h-24 bg-gradient-to-r">
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-background/80 backdrop-blur">
            {institution.rankings[0]?.rank ?? "Ranked"}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="-mt-12 flex items-end justify-between gap-3">
          <LogoBadge initials={institution.logoInitials} size="lg" />
          {onToggleSelect ? (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-1.5 text-xs font-medium",
                selectDisabled && !selected && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={selected}
                disabled={selectDisabled && !selected}
                onChange={() => onToggleSelect(institution.slug)}
              />
              Compare
            </label>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={institution.type} />
            {institution.verified ? <VerificationBadge /> : null}
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            <Link
              href={DISCOVERY_ROUTES.profile(institution.slug)}
              className="hover:text-primary focus-visible:ring-ring rounded outline-none focus-visible:ring-2"
            >
              {institution.name}
            </Link>
          </h3>
          <p className="text-muted-foreground text-sm">{institution.tagline}</p>
          <RatingStars value={institution.rating} count={institution.reviewCount} />
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {institution.location.city}, {institution.location.state}
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/40 rounded-lg p-2">
            <dt className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
              <Briefcase className="size-3" aria-hidden="true" /> Placement
            </dt>
            <dd className="text-sm font-semibold">{institution.stats.placementRate}%</dd>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <dt className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
              <Award className="size-3" aria-hidden="true" /> Highest
            </dt>
            <dd className="text-sm font-semibold">{institution.stats.highestPackageLpa}L</dd>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <dt className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
              <Wallet className="size-3" aria-hidden="true" /> Fees/yr
            </dt>
            <dd className="text-sm font-semibold">{institution.annualFeesLpa}L</dd>
          </div>
        </dl>

        <div className="mt-auto flex gap-2">
          <Link
            href={DISCOVERY_ROUTES.profile(institution.slug)}
            className={cn(buttonVariants(), "flex-1")}
          >
            View profile
          </Link>
          {onToggleSelect ? (
            <Button
              type="button"
              variant={selected ? "default" : "outline"}
              onClick={() => onToggleSelect(institution.slug)}
              disabled={selectDisabled && !selected}
            >
              {selected ? "Added" : "Compare"}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
