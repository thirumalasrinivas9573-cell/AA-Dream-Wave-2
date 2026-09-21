"use client";

import { GitCompareArrows, School, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { InstitutionCard } from "@/components/discovery/institution-card";
import { EntityFilterSelect } from "@/components/institution/shared/entity-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DISCOVERY_CITIES,
  DISCOVERY_STATES,
  INSTITUTION_DIRECTORY,
  INSTITUTION_TYPE_LABELS,
} from "@/constants/institution-directory";
import { DISCOVERY_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 4;

type SortKey = "relevance" | "rating" | "placement" | "fees-asc" | "ranking";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Top rated" },
  { value: "placement", label: "Best placements" },
  { value: "fees-asc", label: "Lowest fees" },
  { value: "ranking", label: "Best ranking" },
];

const PLACEMENT_BANDS = [
  { value: "70", label: "70%+" },
  { value: "80", label: "80%+" },
  { value: "90", label: "90%+" },
];

const FEE_BANDS = [
  { value: "2", label: "Under ₹2L" },
  { value: "5", label: "Under ₹5L" },
  { value: "10", label: "Under ₹10L" },
];

export function DiscoveryExplorer() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [minPlacement, setMinPlacement] = useState("");
  const [maxFees, setMaxFees] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [selected, setSelected] = useState<string[]>([]);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = INSTITUTION_DIRECTORY.filter((institution) => {
      const matchesQuery =
        !query ||
        institution.name.toLowerCase().includes(query) ||
        institution.location.city.toLowerCase().includes(query) ||
        institution.departments.some((department) =>
          department.toLowerCase().includes(query),
        );
      const matchesState = !state || institution.location.state === state;
      const matchesCity = !city || institution.location.city === city;
      const matchesType = !type || institution.type === type;
      const matchesPlacement =
        !minPlacement || institution.stats.placementRate >= Number(minPlacement);
      const matchesFees = !maxFees || institution.annualFeesLpa <= Number(maxFees);
      return (
        matchesQuery &&
        matchesState &&
        matchesCity &&
        matchesType &&
        matchesPlacement &&
        matchesFees
      );
    });

    const sorted = [...filtered];
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    if (sort === "placement") sorted.sort((a, b) => b.stats.placementRate - a.stats.placementRate);
    if (sort === "fees-asc") sorted.sort((a, b) => a.annualFeesLpa - b.annualFeesLpa);
    if (sort === "ranking")
      sorted.sort(
        (a, b) =>
          Number(a.rankings[0]?.rank.replace(/\D/g, "") ?? 999) -
          Number(b.rankings[0]?.rank.replace(/\D/g, "") ?? 999),
      );
    return sorted;
  }, [city, maxFees, minPlacement, search, sort, state, type]);

  const toggleSelect = (slug: string) => {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : current.length < MAX_COMPARE
          ? [...current, slug]
          : current,
    );
  };

  const clearFilters = () => {
    setSearch("");
    setState("");
    setCity("");
    setType("");
    setMinPlacement("");
    setMaxFees("");
    setSort("relevance");
  };

  return (
    <main id="main-content" tabIndex={-1} className="container-app py-10 outline-none sm:py-14">
      <header className="max-w-3xl">
        <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
          Discover institutions
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Find and compare the institutions that fit your future
        </h1>
        <p className="text-muted-foreground mt-3 text-base text-pretty">
          Browse verified colleges and universities by location, courses, fees, placements and
          rankings — then compare your shortlist side by side.
        </p>
      </header>

      <Card className="bg-card/80 mt-8 backdrop-blur-sm">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pl-9"
            placeholder="Search institutions, cities or courses…"
            aria-label="Search institutions"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <EntityFilterSelect
            label="State"
            value={state}
            onChange={setState}
            options={DISCOVERY_STATES.map((value) => ({ value, label: value }))}
          />
          <EntityFilterSelect
            label="City"
            value={city}
            onChange={setCity}
            options={DISCOVERY_CITIES.map((value) => ({ value, label: value }))}
          />
          <EntityFilterSelect
            label="Type"
            value={type}
            onChange={setType}
            options={Object.entries(INSTITUTION_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <EntityFilterSelect
            label="Placement"
            value={minPlacement}
            onChange={setMinPlacement}
            options={PLACEMENT_BANDS}
          />
          <EntityFilterSelect
            label="Max fees"
            value={maxFees}
            onChange={setMaxFees}
            options={FEE_BANDS}
          />
          <div className="space-y-1.5">
            <Label>Sort by</Label>
            <select
              className="form-control"
              value={sort}
              aria-label="Sort institutions"
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {results.length} institution{results.length === 1 ? "" : "s"} found
          </p>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      </Card>

      {results.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No institutions match your search"
          description="Try broadening your filters or clearing the search term."
          illustration={<School className="size-10" aria-hidden="true" />}
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((institution) => (
            <InstitutionCard
              key={institution.slug}
              institution={institution}
              selected={selected.includes(institution.slug)}
              onToggleSelect={toggleSelect}
              selectDisabled={selected.length >= MAX_COMPARE}
            />
          ))}
        </div>
      )}

      {selected.length > 0 ? (
        <div className="pointer-events-none sticky bottom-4 z-10 mt-8 flex justify-center">
          <div className="border-border bg-background/95 pointer-events-auto flex flex-wrap items-center gap-3 rounded-full border px-4 py-2 shadow-lg backdrop-blur">
            <span className="flex items-center gap-2 text-sm font-medium">
              <GitCompareArrows className="size-4" aria-hidden="true" />
              {selected.length} selected
            </span>
            <span className="text-muted-foreground text-xs">
              (up to {MAX_COMPARE})
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Link
              href={`${DISCOVERY_ROUTES.compare}?ids=${selected.join(",")}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                selected.length < 2 && "pointer-events-none opacity-50",
              )}
              aria-disabled={selected.length < 2}
            >
              Compare now
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
