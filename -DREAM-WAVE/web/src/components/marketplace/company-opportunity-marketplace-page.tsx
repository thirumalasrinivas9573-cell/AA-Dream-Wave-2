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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { marketplaceApi } from "@/lib/api/marketplace";

type CompanyHub = {
  role: string;
  company?: { name: string; industry?: string };
  sections: {
    openRoles?: MarketplaceOpportunityItem[];
    projects?: MarketplaceOpportunityItem[];
    training?: MarketplaceOpportunityItem[];
    partnerInstitutions?: Array<{
      id: string;
      name: string;
      type?: string;
      relationshipType?: string;
      departments?: string[];
    }>;
  };
  counts?: {
    openJobs: number;
    openInternships: number;
    activePartnerships: number;
    listings: number;
  };
  disclaimer?: string;
};

export function CompanyOpportunityMarketplacePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<CompanyHub | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.getCompanyMarketplace(token);
      setHub(res.hub as CompanyHub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company marketplace");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !hub) return <RouteLoading label="Loading company marketplace" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company platform"
        title="Industry Opportunity Marketplace"
        description="Manage open roles, discover partner institutions, and explore collaboration opportunities."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={COMPANY_ROUTES.recruitment}>
              Recruitment
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={COMPANY_ROUTES.collaborationHub}>
              Collaboration Hub
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {hub ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard label="Open jobs" value={String(hub.counts?.openJobs ?? 0)} hint="Published" />
            <SmartStatCard label="Internships" value={String(hub.counts?.openInternships ?? 0)} hint="Published" />
            <SmartStatCard label="Partner institutions" value={String(hub.counts?.activePartnerships ?? 0)} hint="Active" />
            <SmartStatCard label="Total listings" value={String(hub.counts?.listings ?? 0)} hint="All types" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open roles</CardTitle>
                <CardDescription>Jobs and internships you have published</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(hub.sections.openRoles || []).slice(0, 6).map((item) => (
                  <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} />
                ))}
                {!hub.sections.openRoles?.length ? (
                  <EmptyState
                    title="No open roles"
                    description="Create listings from the Recruitment section."
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partner institutions</CardTitle>
                <CardDescription>Authorized campus relationships</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(hub.sections.partnerInstitutions || []).slice(0, 6).map((inst) => (
                  <div key={inst.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{inst.name}</p>
                      {inst.relationshipType ? <Badge variant="outline">{inst.relationshipType}</Badge> : null}
                    </div>
                    {inst.departments?.length ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Departments: {inst.departments.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!hub.sections.partnerInstitutions?.length ? (
                  <EmptyState title="No partner institutions" description="Explore the institution network to build partnerships." />
                ) : null}
              </CardContent>
            </Card>
          </div>

          {(hub.sections.projects?.length || hub.sections.training?.length) ? (
            <section className="grid gap-6 lg:grid-cols-2">
              {hub.sections.projects?.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hub.sections.projects.slice(0, 4).map((item) => (
                      <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} />
                    ))}
                  </CardContent>
                </Card>
              ) : null}
              {hub.sections.training?.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Training</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hub.sections.training.slice(0, 4).map((item) => (
                      <OpportunityMarketplaceCard key={`${item.source}-${item.id}`} item={item} />
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </section>
          ) : null}

          {hub.disclaimer ? <p className="text-muted-foreground text-xs">{hub.disclaimer}</p> : null}
        </>
      ) : null}
    </div>
  );
}
