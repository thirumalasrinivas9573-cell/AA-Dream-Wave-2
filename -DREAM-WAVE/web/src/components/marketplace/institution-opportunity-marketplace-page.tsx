"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import {
  OpportunityMarketplaceCard,
  type MarketplaceOpportunityItem,
} from "@/components/marketplace/opportunity-marketplace-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { marketplaceApi } from "@/lib/api/marketplace";

const TYPE_TABS = ["all", "job", "internship", "research", "project", "training", "event"] as const;

type HubSection = {
  recommended?: MarketplaceOpportunityItem[];
  companyOpportunities?: MarketplaceOpportunityItem[];
  internships?: MarketplaceOpportunityItem[];
  projects?: MarketplaceOpportunityItem[];
  research?: MarketplaceOpportunityItem[];
  training?: MarketplaceOpportunityItem[];
  events?: MarketplaceOpportunityItem[];
  discover?: MarketplaceOpportunityItem[];
};

type InstitutionHub = {
  role: string;
  institution?: { name: string };
  sections: HubSection;
  skillDemand?: Array<{ skill: string; count?: number }>;
  skillGaps?: Array<{ skill: string }>;
  counts?: { total: number; byType?: Record<string, number> };
  potentialPartners?: Array<{ id: string; name: string; fitLevel?: string }>;
  disclaimer?: string;
};

export function InstitutionOpportunityMarketplacePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<InstitutionHub | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.getInstitutionMarketplace(token, {
        type: typeFilter !== "all" ? typeFilter : undefined,
        q: search || undefined,
      });
      setHub(res.hub as InstitutionHub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campus marketplace");
    } finally {
      setLoading(false);
    }
  }, [token, typeFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !hub) return <RouteLoading label="Loading campus marketplace" />;

  const items = hub?.sections.discover || [];

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Campus Opportunity Marketplace"
        description="Discover company opportunities, internships, research, training, and events relevant to your programs and student skills."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.placements}>
              Placements
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.collaborationHub}>
              Collaboration Hub
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {hub ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard label="Total opportunities" value={String(hub.counts?.total ?? 0)} hint="Active" />
            <SmartStatCard label="High relevance" value={String(hub.sections.recommended?.length ?? 0)} hint="Program fit" />
            <SmartStatCard label="Company listings" value={String(hub.sections.companyOpportunities?.length ?? 0)} hint="Industry" />
            <SmartStatCard label="Skill gaps" value={String(hub.skillGaps?.length ?? 0)} hint="Demand vs supply" />
          </section>

          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search opportunities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              aria-label="Search opportunities"
            />
            <Button onClick={() => void load()}>Search</Button>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Opportunity type filters">
            {TYPE_TABS.map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={typeFilter === tab ? "default" : "outline"}
                onClick={() => setTypeFilter(tab)}
                role="tab"
                aria-selected={typeFilter === tab}
              >
                {tab === "all" ? "All" : tab.replace(/_/g, " ")}
              </Button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended for your campus</CardTitle>
                <CardDescription>High program relevance based on aggregate student skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(hub.sections.recommended || []).slice(0, 4).map((item) => (
                  <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} showRelevance />
                ))}
                {!hub.sections.recommended?.length ? (
                  <EmptyState title="No high-relevance matches" description="Opportunities will appear as company listings grow." />
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill demand vs supply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {hub.skillDemand?.length ? (
                  <>
                    <p className="font-medium">In demand</p>
                    <p className="text-muted-foreground">{hub.skillDemand.map((s) => s.skill).slice(0, 6).join(", ")}</p>
                  </>
                ) : null}
                {hub.skillGaps?.length ? (
                  <>
                    <p className="mt-3 font-medium">Gaps</p>
                    <p className="text-muted-foreground">{hub.skillGaps.map((s) => s.skill).slice(0, 6).join(", ")}</p>
                  </>
                ) : null}
                {!hub.skillDemand?.length && !hub.skillGaps?.length ? (
                  <p className="text-muted-foreground">Skill analytics will populate from student profiles.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Discover</h2>
            {items.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} showRelevance />
                ))}
              </div>
            ) : (
              <EmptyState title="No opportunities found" description="Try different filters or check back later." />
            )}
          </section>

          {hub.disclaimer ? <p className="text-muted-foreground text-xs">{hub.disclaimer}</p> : null}
        </>
      ) : null}
    </div>
  );
}
