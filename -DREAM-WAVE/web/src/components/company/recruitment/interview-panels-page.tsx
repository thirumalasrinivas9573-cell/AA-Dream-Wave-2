"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { InterviewPanel } from "@/types/recruitment";

export function InterviewPanelsPage() {
  const { token } = useAuth();
  const [panels, setPanels] = useState<InterviewPanel[]>([]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await recruitmentApi.listPanels(token);
    setPanels(res.panels);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!token || !name.trim()) return;
    await recruitmentApi.createPanel(token, {
      name,
      members: members.split(",").map((n) => ({ name: n.trim(), role: "Interviewer" })).filter((m) => m.name),
    });
    setName("");
    setMembers("");
    await load();
  }

  if (loading) return <RouteLoading label="Loading panels" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment" title="Interview Panels" description="Manage interviewer panels with expertise and availability." />
      <RecruitmentNav />
      <Card>
        <CardHeader><CardTitle>Create panel</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input className="form-control" placeholder="Panel name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="form-control" placeholder="Members (comma-separated)" value={members} onChange={(e) => setMembers(e.target.value)} />
          <Button onClick={() => void create()} className="w-fit"><Plus aria-hidden="true" /> Create panel</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {panels.map((p) => (
          <Card key={p._id}>
            <CardContent className="pt-6">
              <p className="font-semibold">{p.name}</p>
              <p className="text-muted-foreground text-sm">{p.members.map((m) => m.name).join(", ") || "No members"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
