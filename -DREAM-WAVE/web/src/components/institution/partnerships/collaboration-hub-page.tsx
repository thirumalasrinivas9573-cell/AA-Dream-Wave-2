"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { PartnershipRequestDialog } from "@/components/institution/partnerships/partnership-dialogs";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { partnershipIntelligenceApi, type CollaborationHub, type PartnerMatch } from "@/lib/api/partnership-intelligence";
import type { DiscoverableCompany, DiscoverableInstitution } from "@/types/partnership";

type Props = {
  role: "institution" | "company";
};

export function CollaborationHubPage({ role }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<CollaborationHub | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [requestTarget, setRequestTarget] = useState<DiscoverableCompany | DiscoverableInstitution | null>(null);

  const networkRoute = role === "institution" ? INSTITUTION_ROUTES.industryNetwork : COMPANY_ROUTES.institutionNetwork;
  const partnershipRoute = (id: string) =>
    role === "institution" ? INSTITUTION_ROUTES.partnershipDetail(id) : COMPANY_ROUTES.partnershipDetail(id);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [hubRes, ai] = await Promise.all([
        partnershipIntelligenceApi.getHub(token),
        partnershipIntelligenceApi.getHubInsight(token, "COLLABORATION_BRIEF"),
      ]);
      setHub(hubRes.hub);
      setAiInsight(ai.insight?.observation || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collaboration hub");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !hub) return <RouteLoading label="Loading collaboration hub" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow={role === "institution" ? "Institution platform" : "Company platform"}
        title="Collaboration Hub"
        description="University–industry ecosystem intelligence — active partnerships, potential partners, activity, and advisory insights."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={networkRoute}>
              Network
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {hub ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard label="Active partnerships" value={String(hub.counts.activePartnerships)} hint="Live" />
            <SmartStatCard label="Potential partners" value={String(hub.counts.potentialPartners)} hint="Matched" />
            <SmartStatCard label="Pending incoming" value={String(hub.counts.pendingIncoming)} hint="Requests" />
            <SmartStatCard label="Pending outgoing" value={String(hub.counts.pendingOutgoing)} hint="Sent" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Potential partners</CardTitle>
                <CardDescription>Evidence-based fit — not partnership guarantees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hub.potentialPartners.length ? (
                  hub.potentialPartners.slice(0, 6).map((p: PartnerMatch) => (
                    <div key={p.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{p.name}</p>
                        <Badge variant="outline">{p.fitLevel.replace(/_/g, " ")}</Badge>
                      </div>
                      {p.overlappingAreas?.length ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Overlap: {p.overlappingAreas.slice(0, 4).join(", ")}
                        </p>
                      ) : null}
                      {p.potentialCollaborationTypes?.length ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Possible: {p.potentialCollaborationTypes.join(", ")}
                        </p>
                      ) : null}
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 h-auto p-0"
                        onClick={() =>
                          setRequestTarget(
                            role === "institution"
                              ? ({ _id: p.id, name: p.name, industry: p.industry } as DiscoverableCompany)
                              : ({ _id: p.id, name: p.name, type: p.industry } as DiscoverableInstitution),
                          )
                        }
                      >
                        Prepare collaboration request
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No matches" description="Discovery data will populate recommendations." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partnership activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hub.activityFeed.length ? (
                  hub.activityFeed.slice(0, 8).map((a) => (
                    <div key={a.id} className="border-b pb-2 last:border-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.description ? <p className="text-muted-foreground text-xs">{a.description}</p> : null}
                      {a.partnershipId ? (
                        <Link href={partnershipRoute(a.partnershipId)} className="text-primary text-xs underline-offset-2 hover:underline">
                          View partnership
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState title="No activity yet" description="Partnership events will appear here." />
                )}
              </CardContent>
            </Card>
          </div>

          {hub.alerts.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Important</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hub.alerts.map((a) => (
                  <div key={a.id} className="rounded border p-3">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-xs">{a.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {aiInsight ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{aiInsight}</p>
                <p className="text-muted-foreground mt-2 text-xs">Advisory only. External communication requires your confirmation.</p>
              </CardContent>
            </Card>
          ) : null}

          {hub.disclaimer ? <p className="text-muted-foreground text-xs">{hub.disclaimer}</p> : null}
        </>
      ) : null}

      <PartnershipRequestDialog
        open={!!requestTarget}
        onOpenChange={(open) => !open && setRequestTarget(null)}
        token={token}
        initiatorRole={role}
        targetCompany={role === "institution" ? (requestTarget as DiscoverableCompany | null) : null}
        targetInstitution={role === "company" ? (requestTarget as DiscoverableInstitution | null) : null}
      />
    </div>
  );
}
