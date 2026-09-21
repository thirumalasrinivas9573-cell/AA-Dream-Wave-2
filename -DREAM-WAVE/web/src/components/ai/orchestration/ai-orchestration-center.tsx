"use client";

import {
  Bot,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  orchestrationApi,
  type AgentExecution,
} from "@/lib/api/orchestration";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted"> = {
  COMPLETED: "default",
  RUNNING: "secondary",
  WAITING_APPROVAL: "outline",
  FAILED: "muted",
  SIMULATION: "secondary",
};

export function AiOrchestrationCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Array<{ agentId: string; name: string; status: string }>>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<AgentExecution | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [h, list] = await Promise.all([
        orchestrationApi.getHealth(token),
        orchestrationApi.listExecutions(token),
      ]);
      setHealth(h.health);
      setExecutions(list.executions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orchestration center");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const runQuery = async (simulation = false) => {
    if (!token || !query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await orchestrationApi.run(token, { query: query.trim(), simulation });
      if (res.awaitingApproval && res.execution) {
        setSelected(res.execution);
        setApprovalOpen(true);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orchestration failed");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!token || !selected) return;
    setBusy(true);
    try {
      await orchestrationApi.approve(token, selected._id);
      setApprovalOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !executions.length) return <RouteLoading label="Loading AI orchestration center" />;

  const waiting = executions.filter((e) => e.status === "WAITING_APPROVAL");
  const running = executions.filter((e) => e.status === "RUNNING");
  const failed = executions.filter((e) => e.status === "FAILED");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave AI</p>
        <h1 className="text-2xl font-semibold tracking-tight">AI Orchestration Center</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Plan → Validate → Authorize → Approve → Execute → Verify → Audit. Agents coordinate existing capabilities — no uncontrolled autonomous actions.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Active tasks</CardDescription><CardTitle>{running.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Waiting approval</CardDescription><CardTitle>{waiting.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Completed</CardDescription><CardTitle>{executions.filter((e) => e.status === "COMPLETED").length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Failed</CardDescription><CardTitle>{failed.length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />Start orchestration</CardTitle>
          <CardDescription>Example: &quot;Help me find internships and what I need to improve&quot;</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your objective..."
            className="max-w-md"
            onKeyDown={(e) => e.key === "Enter" && void runQuery(false)}
          />
          <Button onClick={() => void runQuery(false)} disabled={busy || !query.trim()}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
          <Button variant="outline" onClick={() => void runQuery(true)} disabled={busy || !query.trim()}>
            Simulate
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {health.map((a) => (
              <Badge key={a.agentId} variant="outline" className="gap-1">
                <Bot className="h-3 w-3" />
                {a.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length ? (
            <ul className="space-y-2">
              {executions.slice(0, 15).map((ex) => (
                <li key={ex._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{ex.intent.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground line-clamp-1">{ex.query || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[ex.status] || "outline"}>{ex.status}</Badge>
                    {ex.status === "WAITING_APPROVAL" ? (
                      <Button size="sm" variant="outline" onClick={() => { setSelected(ex); setApprovalOpen(true); }}>
                        <Shield className="mr-1 h-3 w-3" />
                        Review
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => void orchestrationApi.getExecution(token!, ex._id).then((r) => setSelected(r.execution))}>
                      Detail
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No orchestrations yet" description="Run an objective to see agent coordination here." />
          )}
        </CardContent>
      </Card>

      {selected && !approvalOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution detail</CardTitle>
            <CardDescription>{selected.intent} · {selected.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selected.result?.summary ? <p>{selected.result.summary}</p> : null}
            <ol className="space-y-2">
              {selected.steps.map((step) => (
                <li key={step.order} className="rounded-md border p-2">
                  <p className="font-medium">{step.agentId} → {step.toolId}</p>
                  <p className="text-muted-foreground">{step.objective}</p>
                  <Badge variant="outline" className="mt-1">{step.status}</Badge>
                  {step.output?.summary ? <p className="mt-1">{step.output.summary}</p> : null}
                  {step.error ? <p className="text-destructive">{step.error}</p> : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Approval required"
        description="Review planned agents, tools, and external actions before execution."
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p><strong>Objective:</strong> {selected.query}</p>
            <ul className="space-y-2">
              {selected.plan.map((p) => (
                <li key={p.order} className="rounded border p-2">
                  {p.agentId}: {p.objective}
                  {p.requiresApproval ? (
                    <Badge variant="outline" className="ml-2">Approval required</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" disabled={busy} onClick={() => setApprovalOpen(false)}>Cancel</Button>
              <Button disabled={busy} onClick={() => void approve()}>Approve &amp; Execute</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
