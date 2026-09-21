"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { RecruitmentInterview } from "@/types/recruitment";

export function InterviewManagementPage() {
  const { token } = useAuth();
  const [interviews, setInterviews] = useState<RecruitmentInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.listInterviews(token);
      setInterviews(res.interviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    if (!token) return;
    await recruitmentApi.cancelInterview(token, id, "Cancelled by recruiter");
    await load();
  }

  if (loading) return <RouteLoading label="Loading interviews" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment" title="Interview Management" description="Schedule, reschedule, and track all company interviews." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}
      {!interviews.length ? (
        <EmptyState title="No interviews scheduled" description="Schedule interviews from application workspaces." />
      ) : (
        <div className="space-y-3">
          {interviews.map((i) => (
            <Card key={i._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{i.round} · {i.interviewType || i.mode}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{new Date(i.scheduledDate).toLocaleDateString()} {i.scheduledTime} · {i.status}</span>
                {i.status === "scheduled" ? (
                  <Button size="sm" variant="outline" onClick={() => void cancel(i._id)}>Cancel</Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
