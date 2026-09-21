"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import { marketplaceApi } from "@/lib/api/marketplace";

type Job = { id: string; title: string; status: string };
type Candidate = {
  applicationId: string;
  name: string;
  stage: string;
  matchCategory: string;
  skillMatch: { coveragePercent: number };
  explanation: { matched: string[]; missing: string[] };
};

export function RecruiterMatchTalentPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    recruitmentApi.listJobs(token).then((res) => {
      setJobs((res.jobs || []).map((j: { _id?: string; id?: string; title: string; status: string }) => ({
        id: j.id || j._id || "",
        title: j.title,
        status: j.status,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const runMatch = useCallback(async () => {
    if (!token || !selectedJob) return;
    setError(null);
    try {
      const res = await marketplaceApi.matchTalentToRole(token, "job", selectedJob);
      setCandidates((res.matching.candidates || []) as Candidate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
      setCandidates([]);
    }
  }, [token, selectedJob]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading roles" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company recruitment"
        title="Match Talent to Role"
        description="Explainable candidate ranking from authorized application snapshots. Human review required for shortlisting."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Open role</label>
          <select className="form-control min-w-[240px]" value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
            <option value="">Select job…</option>
            {jobs.filter((j) => j.status === "open" || j.status === "published").map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
        <Button disabled={!selectedJob} onClick={() => void runMatch()}>Match talent</Button>
      </div>

      {candidates.length ? (
        <div className="space-y-3">
          {candidates.map((c) => (
            <Card key={c.applicationId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge>{c.matchCategory.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Alignment: {c.skillMatch.coveragePercent}% profile-to-requirement</p>
                <p className="text-muted-foreground mt-1">Matched: {c.explanation.matched.join(", ") || "—"}</p>
                {c.explanation.missing.length ? (
                  <p className="text-muted-foreground">Missing: {c.explanation.missing.join(", ")}</p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">Stage: {c.stage} · AI recommends review only</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedJob ? (
        <EmptyState title="No matching candidates" description="Candidates appear when applications exist for this role." />
      ) : null}
    </div>
  );
}
