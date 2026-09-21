import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

function qs(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export type WorkflowStatus =
  | "DRAFT"
  | "READY"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export interface WorkflowStepPreview {
  action?: string;
  why?: string;
  target?: string;
  data?: string;
  expectedResult?: string;
  risk?: string;
  emailPreview?: { to?: string; subject?: string; body?: string };
  notificationPreview?: { title?: string; body?: string };
}

export interface WorkflowExecution {
  _id: string;
  templateId: string;
  name: string;
  status: WorkflowStatus;
  trigger: string;
  approvalPolicy: string;
  steps: Array<{
    order: number;
    action: string;
    status: string;
    preview?: WorkflowStepPreview;
    result?: Record<string, unknown>;
    error?: string;
  }>;
  auditLog: Array<{
    action: string;
    result: string;
    timestamp: string;
  }>;
  context?: Record<string, unknown>;
  expiresAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyOperationsBrief {
  generatedAt: string;
  deadlines: Array<{ opportunityId?: string; title?: string; deadline?: string }>;
  pendingApprovals: number;
  failedWorkflows: number;
  partnershipReviews: Array<{ partnershipId?: string; label?: string; endDate?: string }>;
  placementActions: Array<{ label: string; count?: number; value?: string }>;
  companyActivity: Array<{ label?: string; href?: string }>;
  dataLimitations: string[];
}

export interface PendingAction {
  type: string;
  id?: string;
  why?: string;
  owner?: string;
  deadline?: string | null;
  nextStep?: string;
}

export const operationsApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean; statuses: string[]; actions: string[] }>(
      "/operations/meta",
      opts(token),
    ),

  getTemplates: (token: string) =>
    apiRequest<{
      success: boolean;
      templates: Array<{ id: string; name: string; trigger: string; approvalPolicy: string }>;
    }>("/operations/templates", opts(token)),

  getDailyBrief: (token: string) =>
    apiRequest<{ success: boolean; brief: DailyOperationsBrief }>(
      "/operations/daily-brief",
      opts(token),
    ),

  getPendingActions: (token: string) =>
    apiRequest<{ success: boolean; actions: PendingAction[]; total: number }>(
      "/operations/pending-actions",
      opts(token),
    ),

  getMonitor: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{
      success: boolean;
      monitor: {
        counts: Record<string, number>;
        observability: { successRate: number | null };
        recent: Array<{ _id: string; name: string; status: string }>;
      };
    }>(`/operations/monitor${qs(params)}`, opts(token)),

  getFailed: (token: string) =>
    apiRequest<{
      success: boolean;
      failed: Array<{ id: string; name: string; error?: string; canRetry?: boolean }>;
    }>("/operations/failed", opts(token)),

  getAiSummary: (token: string) =>
    apiRequest<{
      success: boolean;
      summary: {
        whatChanged: string[];
        whatMatters: string[];
        whatNeedsAction: unknown[];
        whatIsWaiting: number;
        whatFailed: number;
        dataLimitations: string[];
      };
    }>("/operations/ai-summary", opts(token)),

  getApprovals: (token: string) =>
    apiRequest<{ success: boolean; approvals: PendingAction[] }>(
      "/operations/approvals",
      opts(token),
    ),

  getWorkflows: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; workflows: WorkflowExecution[] }>(
      `/operations/workflows${qs(params)}`,
      opts(token),
    ),

  getWorkflow: (token: string, id: string) =>
    apiRequest<{ success: boolean; workflow: WorkflowExecution }>(
      `/operations/workflows/${id}`,
      opts(token),
    ),

  createFromTemplate: (
    token: string,
    body: { templateId: string; context?: Record<string, unknown>; trigger?: string },
  ) =>
    apiRequest<{ success: boolean; execution: WorkflowExecution; duplicate?: boolean }>(
      "/operations/workflows/from-template",
      { ...opts(token), method: "POST", body },
    ),

  planWorkflow: (token: string, intent: string, context?: Record<string, unknown>) =>
    apiRequest<{
      success: boolean;
      plan: { intent: string; templateId: string; steps: Array<{ step: number; description: string }> };
    }>("/operations/workflows/plan", {
      ...opts(token),
      method: "POST",
      body: { intent, context },
    }),

  approveWorkflow: (token: string, id: string, decision: "approved" | "rejected", comment?: string) =>
    apiRequest<{ success: boolean; workflow: WorkflowExecution }>(
      `/operations/workflows/${id}/approve`,
      { ...opts(token), method: "POST", body: { decision, comment } },
    ),

  executeWorkflow: (token: string, id: string) =>
    apiRequest<{ success: boolean; execution: WorkflowExecution; duplicate?: boolean }>(
      `/operations/workflows/${id}/execute`,
      { ...opts(token), method: "POST" },
    ),

  retryWorkflow: (token: string, id: string) =>
    apiRequest<{ success: boolean; execution: WorkflowExecution }>(
      `/operations/workflows/${id}/retry`,
      { ...opts(token), method: "POST" },
    ),
};
