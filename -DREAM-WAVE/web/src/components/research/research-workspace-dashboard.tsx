"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  researchWorkspaceApi,
  type ResearchReport,
  type ResearchWorkspace,
  type WorkspaceDashboard,
} from "@/lib/api/research-workspace";

const LABEL_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  SOURCE_FACT: "default",
  FACT: "default",
  SYNTHESIS: "secondary",
  INFERENCE: "outline",
  RECOMMENDATION: "outline",
};

type Props = { workspaceId: string };

export function ResearchWorkspaceDashboard({ workspaceId }: Props) {
  const { token } = useAuth();
  const [workspace, setWorkspace] = useState<ResearchWorkspace | null>(null);
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatQ, setChatQ] = useState("");
  const [chatA, setChatA] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wsRes, dashRes] = await Promise.all([
        researchWorkspaceApi.get(token, workspaceId),
        researchWorkspaceApi.dashboard(token, workspaceId),
      ]);
      setWorkspace(wsRes.workspace);
      setDashboard(dashRes.dashboard);
      const latest = wsRes.workspace.reports?.[wsRes.workspace.reports.length - 1];
      if (latest) setActiveReport(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: string, fn: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setBusy(null);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading || !workspace || !dashboard) return <RouteLoading label="Loading research workspace" />;

  return (
    <div className="container-app space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/research/workspace" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          All workspaces
        </Link>
        <Badge variant="outline">{workspace.status}</Badge>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{workspace.title}</h1>
        <p className="text-muted-foreground text-sm">{workspace.researchQuestion}</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() =>
            void run("collect", async () => {
              if (!token) return;
              await researchWorkspaceApi.collectSources(token, workspaceId);
            })
          }
        >
          <Sparkles className="mr-1 h-4 w-4" />
          {busy === "collect" ? "Collecting…" : "Collect sources"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            void run("evidence", async () => {
              if (!token) return;
              await researchWorkspaceApi.extractEvidence(token, workspaceId);
            })
          }
        >
          <FlaskConical className="mr-1 h-4 w-4" />
          Extract evidence
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            void run("synthesize", async () => {
              if (!token) return;
              await researchWorkspaceApi.synthesize(token, workspaceId);
            })
          }
        >
          Synthesize
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            void run("report", async () => {
              if (!token) return;
              const res = await researchWorkspaceApi.generateReport(token, workspaceId, {
                template: "CAREER_RESEARCH",
              });
              setActiveReport(res.report);
            })
          }
        >
          <FileText className="mr-1 h-4 w-4" />
          Generate report
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Research plan</CardTitle>
            <CardDescription>Concise plan — no hidden chain-of-thought.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-4 text-sm">
              {(dashboard.plan || []).map((p) => (
                <li key={p.order}>
                  {p.step} <span className="text-muted-foreground">({p.agentId})</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><p className="text-2xl font-semibold">{dashboard.sourceCount}</p><p className="text-muted-foreground text-xs">Sources</p></div>
            <div><p className="text-2xl font-semibold">{dashboard.evidenceCount}</p><p className="text-muted-foreground text-xs">Evidence</p></div>
            <div><p className="text-2xl font-semibold">{dashboard.claimCount}</p><p className="text-muted-foreground text-xs">Claims</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Source library</CardTitle></CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {workspace.sources.length ? workspace.sources.map((s) => (
              <div key={s.sourceRefId} className="rounded-lg border p-2">
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground text-xs">{s.sourceType} · {s.authority || "UNKNOWN"}</p>
                {s.excerpt ? <p className="mt-1 line-clamp-2 text-xs">{s.excerpt}</p> : null}
              </div>
            )) : <p className="text-muted-foreground text-xs">No sources yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Evidence panel</CardTitle></CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {workspace.evidence.length ? workspace.evidence.map((e, i) => (
              <div key={`${e.claimId}-${i}`} className="rounded-lg border p-2">
                <Badge variant="outline" className="mb-1">SOURCE EVIDENCE</Badge>
                <p className="line-clamp-3 text-xs">{e.excerpt}</p>
                <p className="text-muted-foreground mt-1 text-xs">{e.location || "location unknown"}</p>
              </div>
            )) : <p className="text-muted-foreground text-xs">Extract evidence after collecting sources.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Synthesis panel</CardTitle></CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {(workspace.synthesis?.keyFindings || []).map((f, i) => (
              <div key={i} className="rounded-lg border p-2">
                <Badge variant={LABEL_VARIANT[f.label] ?? "secondary"}>{f.label}</Badge>
                <p className="mt-1 text-xs">{f.text}</p>
              </div>
            ))}
            {(workspace.synthesis?.contradictions || []).map((c, i) => (
              <div key={i} className="border-destructive/30 rounded-lg border p-2 text-xs">
                Contradiction: {c.description}
              </div>
            ))}
            {(workspace.synthesis?.gaps || []).map((g, i) => (
              <p key={i} className="text-muted-foreground text-xs">Gap: {g}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {workspace.synthesis?.evidenceMatrix?.length ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Evidence matrix</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Claim</th>
                  {workspace.sources.map((s) => (
                    <th key={s.sourceRefId} className="p-2">{s.title.slice(0, 20)}</th>
                  ))}
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {workspace.synthesis.evidenceMatrix.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 max-w-xs truncate">{row.claim}</td>
                    {workspace.sources.map((s) => (
                      <td key={s.sourceRefId} className="p-2">{row.sources[s.sourceRefId] || "—"}</td>
                    ))}
                    <td className="p-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report builder</CardTitle>
          <CardDescription>Draft → review → approve. Citations from actual sources only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeReport ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{activeReport.status}</Badge>
                <span className="text-muted-foreground text-xs">v{activeReport.version} · {activeReport.template}</span>
                {activeReport.qualityIssues?.length ? (
                  <span className="text-destructive text-xs">{activeReport.qualityIssues.length} issue(s)</span>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() =>
                    void run("review", async () => {
                      if (!token) return;
                      await researchWorkspaceApi.reviewReport(token, workspaceId, activeReport.reportId);
                    })
                  }
                >
                  Run quality check
                </Button>
                <Button
                  size="sm"
                  disabled={!!busy || activeReport.status === "APPROVED"}
                  onClick={() =>
                    void run("approve", async () => {
                      if (!token) return;
                      await researchWorkspaceApi.approveReport(token, workspaceId, activeReport.reportId);
                    })
                  }
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/research/workspace/${workspaceId}/reports/${activeReport.reportId}/export`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!token) return;
                    void fetch(
                      `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/research/workspace/${workspaceId}/reports/${activeReport.reportId}/export`,
                      { headers: { Authorization: `Bearer ${token}` } },
                    )
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `report-${activeReport.reportId}.csv`;
                        a.click();
                      });
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Export CSV
                </a>
              </div>
              <div className="space-y-3">
                {activeReport.sections.map((sec) => (
                  <div key={sec.key} className="rounded-lg border p-3">
                    <h3 className="text-sm font-medium">{sec.title}</h3>
                    <pre className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs">{sec.content}</pre>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Generate a report after synthesis.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Research chat</CardTitle>
          <CardDescription>Ask about this workspace only — strongest findings, disagreements, evidence.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            value={chatQ}
            onChange={(e) => setChatQ(e.target.value)}
            placeholder="Which sources disagree?"
            className="max-w-md"
            onKeyDown={(e) => {
              if (e.key === "Enter" && token && chatQ.trim()) {
                void researchWorkspaceApi.chat(token, workspaceId, chatQ.trim()).then((r) => setChatA(r.answer));
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!token || !chatQ.trim()) return;
              void researchWorkspaceApi.chat(token, workspaceId, chatQ.trim()).then((r) => setChatA(r.answer));
            }}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Ask
          </Button>
          {chatA ? (
            <div className="w-full rounded-lg border p-3 text-sm">
              <Badge variant="secondary" className="mb-2">AI SUMMARY</Badge>
              <pre className="whitespace-pre-wrap text-xs">{chatA}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {(dashboard.timeline || []).map((t, i) => (
            <p key={i}>
              <span className="text-muted-foreground">{new Date(t.timestamp).toLocaleString()}</span>
              {" — "}
              {t.description}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
