"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { StageBadge } from "@/components/company/recruitment/recruitment-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { RecruitmentApplication } from "@/types/recruitment";

export function ShortlistPage() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.listShortlisted(token, { limit: 100 });
      setApplications(res.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shortlist");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: string) {
    if (!token || !selected.size) return;
    try {
      await recruitmentApi.bulkShortlistAction(token, [...selected], action);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    }
  }

  if (loading) return <RouteLoading label="Loading shortlist" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment Workspace" title="Shortlist Management" description="Review, approve, and move shortlisted candidates through the pipeline." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void bulkAction("move_to_assessment")}>Move to assessment</Button>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("move_to_interview")}>Move to interview</Button>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("reject")}>Reject selected</Button>
        </div>
      ) : null}

      {!applications.length ? (
        <EmptyState title="No shortlisted candidates" description="Move candidates to the shortlisted stage from the pipeline or applications view." />
      ) : (
        <Card>
          <CardHeader><CardTitle>{applications.length} shortlisted</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {applications.map((app) => (
              <div key={app.id} className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggle(app.id)} aria-label={`Select ${app.candidateSnapshot.name}`} />
                <div className="min-w-0 flex-1">
                  <Link href={COMPANY_ROUTES.applicationDetail(app.id)} className="font-medium hover:underline">{app.candidateSnapshot.name}</Link>
                  <p className="text-muted-foreground text-sm">{app.roleTitle} · {app.department || "—"}</p>
                </div>
                <StageBadge stage={app.stage} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
