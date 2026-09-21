"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LogoBadge, RatingStars } from "@/components/discovery/discovery-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getInstitutionBySlug,
  INSTITUTION_DIRECTORY,
  INSTITUTION_TYPE_LABELS,
} from "@/constants/institution-directory";
import { DISCOVERY_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { InstitutionProfile } from "@/types/institution-discovery";

const MAX_COMPARE = 4;

type Row =
  | { label: string; render: (institution: InstitutionProfile) => string | number }
  | { label: string; bool: (institution: InstitutionProfile) => boolean };

const ROWS: Row[] = [
  { label: "Type", render: (i) => INSTITUTION_TYPE_LABELS[i.type] },
  { label: "Location", render: (i) => `${i.location.city}, ${i.location.state}` },
  { label: "Established", render: (i) => i.established },
  { label: "Overall rating", render: (i) => `${i.rating.toFixed(1)} / 5` },
  { label: "NIRF / Ranking", render: (i) => i.rankings[0]?.rank ?? "—" },
  { label: "Annual fees", render: (i) => `₹${i.annualFeesLpa} L` },
  { label: "Placement rate", render: (i) => `${i.stats.placementRate}%` },
  { label: "Highest package", render: (i) => `${i.stats.highestPackageLpa} LPA` },
  { label: "Average package", render: (i) => `${i.stats.avgPackageLpa} LPA` },
  { label: "Students", render: (i) => i.stats.students.toLocaleString() },
  { label: "Faculty", render: (i) => i.stats.faculty },
  { label: "Departments", render: (i) => i.stats.departments },
  { label: "Programs", render: (i) => i.stats.programs },
  { label: "Accreditation", render: (i) => i.accreditation.join(", ") },
  { label: "Hostel", bool: (i) => i.facilities.hostel },
  { label: "Sports", bool: (i) => i.facilities.sports },
  { label: "Library", bool: (i) => i.facilities.library },
  { label: "Innovation lab", bool: (i) => i.facilities.innovationLab },
];

export function InstitutionCompare() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slugs = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    return raw
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPARE);
  }, [searchParams]);

  const institutions = useMemo(
    () =>
      slugs
        .map((slug) => getInstitutionBySlug(slug))
        .filter((item): item is InstitutionProfile => Boolean(item)),
    [slugs],
  );

  const updateSlugs = (next: string[]) => {
    const params = new URLSearchParams();
    if (next.length) params.set("ids", next.join(","));
    router.replace(`${DISCOVERY_ROUTES.compare}?${params.toString()}`);
  };

  const remove = (slug: string) => updateSlugs(slugs.filter((item) => item !== slug));
  const add = (slug: string) => {
    if (slugs.length >= MAX_COMPARE || slugs.includes(slug)) return;
    updateSlugs([...slugs, slug]);
  };

  const available = INSTITUTION_DIRECTORY.filter((item) => !slugs.includes(item.slug));

  return (
    <main id="main-content" tabIndex={-1} className="container-app py-10 outline-none sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">Compare</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Compare institutions
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Compare up to {MAX_COMPARE} institutions across academics, placements, fees and facilities.
          </p>
        </div>
        <Link href={DISCOVERY_ROUTES.explore} className={buttonVariants({ variant: "outline" })}>
          Back to discovery
        </Link>
      </header>

      {institutions.length < 2 ? (
        <EmptyState
          className="mt-10"
          title="Select at least two institutions"
          description="Add institutions from the discovery page or the picker below to compare them."
          action={
            <Link href={DISCOVERY_ROUTES.explore} className={buttonVariants()}>
              Browse institutions
            </Link>
          }
        />
      ) : (
        <Card className="mt-8 overflow-x-auto" padding="none">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-muted/40 sticky left-0 z-10 w-40 p-4 text-left align-bottom text-xs font-medium text-muted-foreground">
                  Attribute
                </th>
                {institutions.map((institution) => (
                  <th key={institution.slug} className="border-border min-w-[180px] border-l p-4 align-bottom">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <LogoBadge initials={institution.logoInitials} size="sm" />
                      <Link
                        href={DISCOVERY_ROUTES.profile(institution.slug)}
                        className="hover:text-primary text-sm font-semibold"
                      >
                        {institution.name}
                      </Link>
                      <RatingStars value={institution.rating} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(institution.slug)}
                      >
                        <X aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-border border-t">
                  <th className="bg-muted/40 sticky left-0 z-10 p-4 text-left font-medium">
                    {row.label}
                  </th>
                  {institutions.map((institution) => (
                    <td key={institution.slug} className="border-border border-l p-4 text-center">
                      {"bool" in row ? (
                        row.bool(institution) ? (
                          <Check className="mx-auto size-4 text-emerald-500" aria-label="Yes" />
                        ) : (
                          <Minus className="text-muted-foreground mx-auto size-4" aria-label="No" />
                        )
                      ) : (
                        row.render(institution)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {slugs.length < MAX_COMPARE && available.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Add another institution</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {available.map((institution) => (
              <button
                key={institution.slug}
                type="button"
                onClick={() => add(institution.slug)}
                className={cn(
                  "border-border bg-card hover:border-primary/40 focus-visible:ring-ring flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
                )}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {institution.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
