"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  opportunityIntelligenceApi,
  type OpportunityDetail,
} from "@/lib/api/opportunity-intelligence";
import { applicationWorkspaceApi } from "@/lib/api/application-workspace";
import { cn } from "@/lib/utils";

export function OpportunityIntelligenceDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ source: string; sourceId: string }>();
  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.source || !params.sourceId) return;
    setLoading(true);
    try {
      const res = await opportunityIntelligenceApi.detail(token, params.source, params.sourceId);
      setDetail(res.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }, [token, params.source, params.sourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!token || !params.source || !params.sourceId) return;
    setBusy(true);
    try {
      await opportunityIntelligenceApi.save(token, params.source, params.sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleStartApplication = async () => {
    if (!token || !params.source || !params.sourceId) return;
    setBusy(true);
    try {
      const res = await applicationWorkspaceApi.start(token, params.source, params.sourceId);
      router.push(`/applications/workspace/${res.workspace.workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start application workspace");
    } finally {
      setBusy(false);
    }
  };

  const handleCoverLetter = async () => {
    if (!token || !params.source || !params.sourceId) return;
    setBusy(true);
    try {
      const res = await opportunityIntelligenceApi.coverLetter(token, params.source, params.sourceId);
      setCoverLetter(res.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover letter failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <RouteLoading label="Loading opportunity detail" />;
  if (!detail) return <Alert variant="error">{error || "Opportunity not found"}</Alert>;

  const { opportunity, match, preparation, application } = detail;

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <Link
        href="/opportunities/intelligence"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
      >
        ← Back to intelligence
      </Link>

      <Card>
        <CardHeader>
          <CardDescription>{opportunity.organization} · {opportunity.type}</CardDescription>
          <CardTitle>{opportunity.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge>{match.state.replace(/_/g, " ")}</Badge>
          <Badge variant="outline">{opportunity.sourceType}</Badge>
          <Badge variant="outline">{opportunity.freshness}</Badge>
          {opportunity.daysRemaining != null ? (
            <Badge variant="outline">{opportunity.daysRemaining} days remaining</Badge>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why this matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {match.whyItMatches.map((r) => (
              <p key={r}>• {r}</p>
            ))}
            {match.whatIsMissing.length ? (
              <div>
                <p className="font-medium mt-2">Missing</p>
                {match.whatIsMissing.map((s) => (
                  <Badge key={s} variant="outline" className="mr-1">{s}</Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preparation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {preparation.projects.map((p) => (
              <p key={p.title}>Project: {p.title} — {p.relevance}</p>
            ))}
            {preparation.learning.map((l) => (
              <p key={l.skill}>Learn: {l.skill}</p>
            ))}
            <p className="text-muted-foreground">Interview: {preparation.interview.explanation}</p>
            <p>Readiness: {application.readinessState.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {application.checklist.map((c) => (
            <div key={c.item} className="flex justify-between text-sm">
              <span>{c.item}</span>
              <Badge variant="outline">{c.status}</Badge>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" disabled={busy} onClick={() => void handleStartApplication()}>
              Open application workspace
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleSave()}>
              Save opportunity
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleCoverLetter()}>
              Generate cover letter draft
            </Button>
          </div>
          {coverLetter ? (
            <pre className="border-border bg-muted/30 mt-3 overflow-x-auto rounded-lg border p-4 text-xs whitespace-pre-wrap">
              {coverLetter}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      {detail.changes?.length ? (
        <Alert variant="warning">
          Changes detected: {detail.changes.map((c) => c.impact).join("; ")}
        </Alert>
      ) : null}

      <p className="text-muted-foreground text-xs">{detail.disclaimer}</p>
    </div>
  );
}
