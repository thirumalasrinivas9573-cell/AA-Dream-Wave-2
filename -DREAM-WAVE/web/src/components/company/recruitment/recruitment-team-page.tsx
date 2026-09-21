"use client";

import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { RecruiterTeamMember } from "@/types/recruitment";

const ROLES = ["recruitment_admin", "hiring_manager", "recruiter", "interviewer", "hr_executive", "read_only"];

export function RecruitmentTeamPage() {
  const { token } = useAuth();
  const [team, setTeam] = useState<RecruiterTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await recruitmentApi.getProfile(token);
    setTeam((res.profile.recruiterTeam || []) as RecruiterTeamMember[]);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!token) return;
    await recruitmentApi.updateTeam(token, team);
    await load();
  }

  function addMember() {
    setTeam((t) => [...t, { name: "", email: "", role: "recruiter" }]);
  }

  if (loading) return <RouteLoading label="Loading team" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment" title="Recruitment Team" description="Assign roles and permissions to your hiring team." />
      <RecruitmentNav />
      <Card>
        <CardHeader><CardTitle>Team members</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {team.map((m, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <input className="form-control" placeholder="Name" value={m.name} onChange={(e) => setTeam((t) => t.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="form-control" placeholder="Email" value={m.email || ""} onChange={(e) => setTeam((t) => t.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
              <select className="form-control" value={m.role} onChange={(e) => setTeam((t) => t.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addMember}>Add member</Button>
            <Button onClick={() => void save()}>Save team</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
