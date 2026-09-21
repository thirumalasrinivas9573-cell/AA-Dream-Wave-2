"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  applicationWorkspaceApi,
  type ApplicationWorkspaceFull,
} from "@/lib/api/application-workspace";
import { cn } from "@/lib/utils";

export function ApplicationWorkspacePage() {
  const { token } = useAuth();
  const params = useParams<{ workspaceId: string }>();
  const [data, setData] = useState<ApplicationWorkspaceFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.workspaceId) return;
    setLoading(true);
    try {
      const res = await applicationWorkspaceApi.get(token, params.workspaceId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [token, params.workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateCoverLetter = async () => {
    if (!token || !params.workspaceId) return;
    setBusy(true);
    try {
      const res = await applicationWorkspaceApi.coverLetter(token, params.workspaceId);
      setCoverLetter(res.draft);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover letter failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!token || !params.workspaceId || !confirmSubmit) return;
    setBusy(true);
    try {
      await applicationWorkspaceApi.submit(token, params.workspaceId, true);
      await load();
      setConfirmSubmit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <RouteLoading label="Loading application workspace" />;
  if (!data) return <Alert variant="error">{error || "Workspace not found"}</Alert>;

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <Link href="/applications/workspace" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}>
        ← Applications
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{data.workspace.opportunityTitle}</CardTitle>
          <p className="text-muted-foreground text-sm">{data.workspace.organization}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>{data.workspace.status}</Badge>
          <Badge variant="outline">{data.match.state}</Badge>
          <Badge variant="outline">{data.health}</Badge>
          {data.deadline.daysRemaining != null ? (
            <Badge variant="outline">{data.deadline.daysRemaining} days left</Badge>
          ) : (
            <Badge variant="outline">{data.deadline.state}</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Application readiness</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>State: {data.readiness.state}</p>
            <p>Profile: {data.candidateProfile.completeness.level}</p>
            {data.candidateProfile.consistency.flags.map((f) => (
              <p key={f} className="text-amber-600 text-xs">{f}</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Projects to highlight</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {data.selectedProjects.map((p) => (
              <p key={p.title}>{p.title} — {p.reason}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.checklist.map((c) => (
            <div key={c.item} className="flex justify-between text-sm">
              <span>{c.item} {c.required ? "(required)" : "(optional)"}</span>
              <Badge variant="outline">{c.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void generateCoverLetter()}>
            Generate cover letter draft
          </Button>
          {coverLetter || data.documents.find((d) => d.type === "COVER_LETTER")?.content ? (
            <Textarea
              readOnly
              className="min-h-32 font-mono text-xs"
              value={coverLetter || data.documents.find((d) => d.type === "COVER_LETTER")?.content || ""}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Submission</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">Final submission requires your explicit confirmation. AI will not submit automatically.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmSubmit} onChange={(e) => setConfirmSubmit(e.target.checked)} />
            I confirm I have reviewed this application and want to submit
          </label>
          <Button type="button" disabled={!confirmSubmit || busy || data.workspace.status === "APPLIED"} onClick={() => void submit()}>
            Submit application
          </Button>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}
      <p className="text-muted-foreground text-xs">{data.disclaimer}</p>
    </div>
  );
}
