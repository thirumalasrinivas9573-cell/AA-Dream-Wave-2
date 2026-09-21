"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { talentIntelligenceApi } from "@/lib/api/talent-intelligence";
import type { CompanyTalentIntelligence } from "@/types/talent-intelligence";

export function CompanyTalentIntelligencePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<CompanyTalentIntelligence | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await talentIntelligenceApi.getCompanyIntelligence(token);
      setIntel(res.intelligence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load talent intelligence");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !intel) return <RouteLoading label="Loading talent intelligence" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company platform"
        title="Talent Intelligence"
        description="Skill demand, candidate pool, and recruitment funnel — authorized application snapshots only."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartStatCard label="Applications" value={String(intel?.recruitment?.totalApplications ?? 0)} hint="Total" />
        <SmartStatCard label="Active roles" value={String(intel?.recruitment?.activeRecruitments ?? 0)} hint="Open" />
        <SmartStatCard label="Talent pool" value={String(intel?.talentPool?.count ?? 0)} hint="Candidates" />
        <SmartStatCard label="Open roles" value={String(intel?.openRoles?.length ?? 0)} hint="Listed" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill demand</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(intel?.skillDemand || []).length ? (
              intel!.skillDemand.map((d) => (
                <Badge key={d.skill} variant="outline">{d.skill}</Badge>
              ))
            ) : (
              <EmptyState title="No skill demand data" description="Job requirements will populate this view." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(intel?.openRoles || []).length ? (
              intel!.openRoles.map((r) => (
                <div key={r.id} className="border-border rounded-md border p-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-xs">{(r.requiredSkills || []).join(", ") || "No skills listed"}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No open roles</p>
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
