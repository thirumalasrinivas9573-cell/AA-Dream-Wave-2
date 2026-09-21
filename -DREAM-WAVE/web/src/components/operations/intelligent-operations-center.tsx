"use client";

import {
  AlertTriangle,
  Clock,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  operationsApi,
  type DailyOperationsBrief,
  type PendingAction,
  type WorkflowExecution,
} from "@/lib/api/operations";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted"> = {
  COMPLETED: "default",
  RUNNING: "secondary",
  WAITING_APPROVAL: "outline",
  FAILED: "muted",
  APPROVED: "secondary",
};

export function IntelligentOperationsCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DailyOperationsBrief | null>(null);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [monitor, setMonitor] = useState<{
    counts: Record<string, number>;
    recent: Array<{ _id: string; name: string; status: string }>;
  } | null>(null);
  const [failed, setFailed] = useState<Array<{ id: string; name: string; error?: string; canRetry?: boolean }>>([]);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowExecution | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"today" | "pending" | "workflows" | "failed">("today");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [briefRes, pendingRes, monitorRes, failedRes, summaryRes] = await Promise.all([
        operationsApi.getDailyBrief(token),
        operationsApi.getPendingActions(token),
        operationsApi.getMonitor(token),
        operationsApi.getFailed(token),
        operationsApi.getAiSummary(token),
      ]);
      setBrief(briefRes.brief);
      setActions(pendingRes.actions);
      setMonitor(monitorRes.monitor);
      setFailed(failedRes.failed);
      setAiSummary([
        ...summaryRes.summary.whatChanged,
        ...summaryRes.summary.whatMatters,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations center");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openApproval = async (workflowId: string) => {
    if (!token) return;
    try {
      const res = await operationsApi.getWorkflow(token, workflowId);
      setSelectedWorkflow(res.workflow);
      setApprovalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    }
  };

  const handleApprove = async (decision: "approved" | "rejected") => {
    if (!token || !selectedWorkflow) return;
    setBusy(true);
    try {
      await operationsApi.approveWorkflow(token, selectedWorkflow._id, decision);
      if (decision === "approved") {
        await operationsApi.executeWorkflow(token, selectedWorkflow._id);
      }
      setApprovalOpen(false);
      setSelectedWorkflow(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await operationsApi.retryWorkflow(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !brief) return <RouteLoading label="Loading intelligent operations center" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Intelligent Operations Center"
        description="Discover → Analyze → Recommend → Prepare → Request approval → Execute approved actions → Verify → Track → Report. AI recommends; humans approve."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending approvals</CardDescription>
            <CardTitle className="text-2xl">{brief?.pendingApprovals ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed workflows</CardDescription>
            <CardTitle className="text-2xl">{brief?.failedWorkflows ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deadlines (30d)</CardDescription>
            <CardTitle className="text-2xl">{brief?.deadlines?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Partnership reviews</CardDescription>
            <CardTitle className="text-2xl">{brief?.partnershipReviews?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {aiSummary.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              AI operations summary
            </CardTitle>
            <CardDescription>What changed and what needs action — authorized data only.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {aiSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            ["today", "Today"],
            ["pending", "Pending actions"],
            ["workflows", "Workflows"],
            ["failed", "Failed"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "today" ? (
        <div className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                {brief?.deadlines?.length ? (
                  <ul className="space-y-2 text-sm">
                    {brief.deadlines.map((d) => (
                      <li key={String(d.opportunityId)} className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{d.title}</span>
                        {d.deadline ? (
                          <Badge variant="outline">{new Date(d.deadline).toLocaleDateString()}</Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No upcoming deadlines" description="Opportunity deadlines will appear here." />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Placement actions</CardTitle>
              </CardHeader>
              <CardContent>
                {brief?.placementActions?.length ? (
                  <ul className="space-y-2 text-sm">
                    {brief.placementActions.map((a) => (
                      <li key={a.label}>
                        {a.label}: {a.count ?? a.value ?? "—"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No placement actions" description="Campus command center data feeds this section." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "pending" ? (
        <div className="pt-4">
          {actions.length ? (
            <div className="space-y-3">
              {actions.map((a) => (
                <Card key={`${a.type}-${a.id}`}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {a.type.replace(/_/g, " ")}
                      </Badge>
                      <p className="font-medium">{a.why}</p>
                      <p className="text-sm text-muted-foreground">{a.nextStep}</p>
                    </div>
                    {a.type === "approval_needed" && a.id ? (
                      <Button size="sm" onClick={() => void openApproval(String(a.id))}>
                        <Shield className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No pending actions" description="Approvals, reviews, and deadlines appear here." />
          )}
        </div>
      ) : null}

      {tab === "workflows" ? (
        <div className="pt-4">
          {monitor?.recent?.length ? (
            <div className="space-y-2">
              {monitor.recent.map((w) => (
                <Card key={w._id}>
                  <CardContent className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span>{w.name}</span>
                      <Badge variant={STATUS_VARIANT[w.status] || "outline"}>{w.status}</Badge>
                    </div>
                    {w.status === "WAITING_APPROVAL" ? (
                      <Button size="sm" variant="outline" onClick={() => void openApproval(w._id)}>
                        Approve
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No workflows yet" description="Workflow executions appear after triggers or templates run." />
          )}
        </div>
      ) : null}

      {tab === "failed" ? (
        <div className="pt-4">
          {failed.length ? (
            <div className="space-y-3">
              {failed.map((f) => (
                <Card key={f.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <XCircle className="h-4 w-4 text-destructive" />
                        {f.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{f.error}</p>
                    </div>
                    {f.canRetry ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleRetry(f.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Retry
                      </Button>
                    ) : (
                      <Badge variant="outline">Re-approval required</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No failed workflows" description="Failed executions and retry options appear here." />
          )}
        </div>
      ) : null}

      <Dialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Approval required"
        description="Review action, target, and data before approving. External actions are never sent automatically."
      >
        {selectedWorkflow ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Action</p>
              <p className="text-muted-foreground">{selectedWorkflow.name}</p>
            </div>
            <div>
              <p className="font-medium">Why</p>
              <p className="text-muted-foreground">
                {String(selectedWorkflow.context?.why || selectedWorkflow.name)}
              </p>
            </div>
            {selectedWorkflow.steps.map((step) =>
              step.preview ? (
                <div key={step.order} className="rounded-md border p-3">
                  <p className="font-medium">{step.action}</p>
                  <p className="text-muted-foreground">Target: {step.preview.target}</p>
                  <p className="text-muted-foreground">Expected: {step.preview.expectedResult}</p>
                  {step.preview.risk ? (
                    <p className="mt-1 flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {step.preview.risk}
                    </p>
                  ) : null}
                  {step.preview.emailPreview ? (
                    <div className="mt-2 rounded bg-muted p-2">
                      <p className="text-xs font-medium">Email preview (not sent until approved)</p>
                      <p>To: {step.preview.emailPreview.to}</p>
                      <p>Subject: {step.preview.emailPreview.subject}</p>
                    </div>
                  ) : null}
                  {step.preview.notificationPreview ? (
                    <div className="mt-2 rounded bg-muted p-2">
                      <p className="text-xs font-medium">Notification preview</p>
                      <p>{step.preview.notificationPreview.title}</p>
                      <p className="text-muted-foreground">{step.preview.notificationPreview.body}</p>
                    </div>
                  ) : null}
                </div>
              ) : null,
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" disabled={busy} onClick={() => void handleApprove("rejected")}>
                Reject
              </Button>
              <Button disabled={busy} onClick={() => void handleApprove("approved")}>
                Approve &amp; Execute
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
