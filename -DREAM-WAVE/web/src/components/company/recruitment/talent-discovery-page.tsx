"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { TalentCandidate } from "@/types/recruitment";

export function TalentDiscoveryPage() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.discoverTalent(token, {
        q: search || undefined,
        skills: skills || undefined,
      });
      setCandidates(res.candidates);
    } finally {
      setLoading(false);
    }
  }, [token, search, skills]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !candidates.length) return <RouteLoading label="Searching talent" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment" title="Talent Discovery" description="Search candidates by skills, experience, and resume keywords from your applicant pool." />
      <RecruitmentNav />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="form-control" placeholder="Keywords…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className="form-control" placeholder="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
      </div>
      {!candidates.length ? (
        <EmptyState title="No matches" description="Try different search terms or skills." />
      ) : (
        <Card>
          <CardHeader><CardTitle>{candidates.length} candidates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="border-border rounded-lg border p-3 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground">{c.roleTitle} · {c.stage}</p>
                <p>{(c.skills || []).join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
