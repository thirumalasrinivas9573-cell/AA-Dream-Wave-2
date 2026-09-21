"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import {
  OpportunityMarketplaceCard,
  type MarketplaceOpportunityItem,
} from "@/components/marketplace/opportunity-marketplace-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { marketplaceApi } from "@/lib/api/marketplace";

const TYPE_TABS = ["all", "job", "internship", "research", "project", "training", "event"] as const;

type StudentHub = {
  sections: {
    strongMatches?: MarketplaceOpportunityItem[];
    closingSoon?: MarketplaceOpportunityItem[];
    recommended?: MarketplaceOpportunityItem[];
    skillBuilding?: MarketplaceOpportunityItem[];
    discover?: MarketplaceOpportunityItem[];
    newOpportunities?: MarketplaceOpportunityItem[];
  };
  disclaimer?: string;
};

export function MarketplaceBrowsePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<StudentHub | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [compareItems, setCompareItems] = useState<MarketplaceOpportunityItem[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.getHub(token, {
        q: search || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });
      setHub(res.hub as StudentHub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }, [token, search, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleCompare(item: MarketplaceOpportunityItem) {
    setCompareItems((prev) => {
      const exists = prev.some((p) => p.source === item.source && p.id === item.id);
      if (exists) return prev.filter((p) => !(p.source === item.source && p.id === item.id));
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !hub) return <RouteLoading label="Loading marketplace" />;

  const discover = hub?.sections.discover || [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave · Opportunity Marketplace</p>
        <h1 className="text-2xl font-semibold">Discover Opportunities</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Jobs, internships, research, projects, training, and events with explainable profile alignment.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search opportunities"
        />
        <Button onClick={() => void load()}>Search</Button>
        <Link href={ROUTES.opportunities} className={buttonVariants({ variant: "outline" })}>
          My Opportunities feed
        </Link>
        {compareItems.length >= 2 ? (
          <Link
            href={`${ROUTES.marketplaceCompare}?items=${encodeURIComponent(
              JSON.stringify(compareItems.map((i) => ({ source: i.source, id: i.id }))),
            )}`}
            className={buttonVariants({ variant: "default" })}
          >
            Compare ({compareItems.length})
          </Link>
        ) : null}
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

      {hub ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strong matches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(hub.sections.strongMatches || []).slice(0, 3).map((item) => (
                  <OpportunityMarketplaceCard
                    key={`${item.source}-${item.id}`}
                    item={item}
                    compareSelected={compareItems.some((c) => c.source === item.source && c.id === item.id)}
                    onCompareToggle={toggleCompare}
                  />
                ))}
                {!hub.sections.strongMatches?.length ? (
                  <p className="text-muted-foreground text-sm">No strong matches yet — complete your profile.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Closing soon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(hub.sections.closingSoon || []).slice(0, 3).map((item) => (
                  <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} />
                ))}
                {!hub.sections.closingSoon?.length ? (
                  <p className="text-muted-foreground text-sm">No urgent deadlines right now.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Discover</h2>
            {discover.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {discover.map((item) => (
                  <OpportunityMarketplaceCard
                    key={`${item.source}-${item.id}`}
                    item={item}
                    compareSelected={compareItems.some((c) => c.source === item.source && c.id === item.id)}
                    onCompareToggle={toggleCompare}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No opportunities found" description="Try different filters or link your institution profile." />
            )}
          </section>

          {hub.disclaimer ? <p className="text-muted-foreground text-xs">{hub.disclaimer}</p> : null}
        </>
      ) : null}
    </div>
  );
}
