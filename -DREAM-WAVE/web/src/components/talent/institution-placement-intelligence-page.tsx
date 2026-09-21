"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { talentIntelligenceApi } from "@/lib/api/talent-intelligence";
import type { InstitutionPlacementIntelligence } from "@/types/talent-intelligence";

export function InstitutionPlacementIntelligencePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<InstitutionPlacementIntelligence | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await talentIntelligenceApi.getInstitutionIntelligence(token);
      setIntel(res.intelligence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load placement intelligence");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !intel) return <RouteLoading label="Loading placement intelligence" />;

  const placement = intel?.placement;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Placement Intelligence"
        description="Aggregate industry demand, skill gaps, recruitment activity, and student readiness — minimum necessary data only."
        actions={
          <div className="flex gap-2">
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={INSTITUTION_ROUTES.campusCommandCenter}>
              Command Center
            </Link>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartStatCard label="Applications" value={String(placement?.applicationsSubmitted ?? 0)} hint="Submitted" />
        <SmartStatCard label="Placements" value={String(placement?.studentsPlaced ?? 0)} hint="Outcomes" />
        <SmartStatCard label="Active opportunities" value={String(placement?.activeOpportunities ?? 0)} hint="Open" />
        <SmartStatCard label="Talent pool" value={String(intel?.talentPool?.total ?? 0)} hint="Students" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness distribution</CardTitle>
            <CardDescription>Aggregate — not individual predictions</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {intel?.readinessDistribution
              ? Object.entries(intel.readinessDistribution).map(([k, v]) => (
                  <div key={k} className="rounded border p-2">
                    <p className="text-muted-foreground text-xs">{k.replace(/_/g, " ")}</p>
                    <p className="font-semibold">{v}</p>
                  </div>
                ))
              : <p className="text-muted-foreground text-sm">Insufficient data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Industry skill demand</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(intel?.industryDemand || []).length ? (
              intel!.industryDemand.map((d) => (
                <Badge key={d.skill} variant="outline">{d.skill}</Badge>
              ))
            ) : (
              <EmptyState title="No demand data" description="Partner recruitment records will populate this view." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill gaps</CardTitle>
            <CardDescription>Industry demand with limited aggregate student evidence</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(intel?.skillGaps || []).length ? (
              intel!.skillGaps.map((g) => (
                <Badge key={g.skill} variant="secondary">{g.skill}</Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No gaps detected or insufficient data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {intel?.disclaimer ? (
        <p className="text-muted-foreground text-xs">{intel.disclaimer}</p>
      ) : null}
    </div>
  );
}
