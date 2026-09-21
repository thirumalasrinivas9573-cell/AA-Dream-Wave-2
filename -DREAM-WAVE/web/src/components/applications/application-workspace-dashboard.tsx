"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  applicationWorkspaceApi,
  type ApplicationWorkspaceSummary,
} from "@/lib/api/application-workspace";
import { cn } from "@/lib/utils";

export function ApplicationWorkspaceDashboard() {
  const { token } = useAuth();
  const [apps, setApps] = useState<ApplicationWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachQ, setCoachQ] = useState("");
  const [coachA, setCoachA] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await applicationWorkspaceApi.dashboard(token);
      setApps(res.dashboard.activeApplications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const askCoach = async () => {
    if (!token || !coachQ.trim()) return;
    try {
      const res = await applicationWorkspaceApi.coach(token, coachQ.trim());
      setCoachA(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach failed");
    }
  };

  if (loading) return <RouteLoading label="Loading applications" />;

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <Link href="/opportunities/intelligence" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-1")}>
        <ArrowLeft className="size-4" />
        Opportunity Intelligence
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Application Workspace</h1>
        <p className="text-muted-foreground text-sm">Prepare, review, and submit applications — you always control final submission.</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="size-4" />
            Active applications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {apps.length ? (
            apps.map((app) => (
              <div key={app.workspaceId} className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{app.opportunityTitle}</p>
                  <p className="text-muted-foreground text-xs">{app.organization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{app.status}</Badge>
                  <Badge variant="outline">{app.health}</Badge>
                  <Link href={`/applications/workspace/${app.workspaceId}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Open
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No active applications" description="Start from an opportunity in Opportunity Intelligence." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            AI Application Copilot
          </CardTitle>
          <CardDescription>What should I improve before applying?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={coachQ} onChange={(e) => setCoachQ(e.target.value)} placeholder="Can I apply now?" />
            <Button type="button" disabled={!coachQ.trim()} onClick={() => void askCoach()}>Ask</Button>
          </div>
          {coachA ? <div className="border-border bg-muted/30 rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap">{coachA}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
