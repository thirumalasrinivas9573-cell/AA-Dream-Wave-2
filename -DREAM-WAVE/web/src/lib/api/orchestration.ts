import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface OrchestrationPlanStep {
  order: number;
  agentId: string;
  toolId: string;
  objective: string;
  requiresApproval?: boolean;
}

export interface AgentExecution {
  _id: string;
  intent: string;
  query: string;
  status: string;
  simulation: boolean;
  plan: OrchestrationPlanStep[];
  steps: Array<{
    order: number;
    agentId: string;
    toolId: string;
    status: string;
    objective: string;
    output?: { summary?: string; data?: unknown; limitations?: string[] };
    error?: string;
  }>;
  handoffs: Array<{ fromAgent: string; toAgent: string; objective: string }>;
  auditLog: Array<{ action: string; timestamp: string }>;
  result?: {
    summary: string;
    sections: Array<{ summary: string; data?: unknown; limitations?: string[] }>;
    nextActions?: string[];
  };
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export const orchestrationApi = {
  getRegistry: (token: string) =>
    apiRequest<{ success: boolean; agents: Array<{ agentId: string; name: string }>; tools: Array<{ toolId: string; name: string }> }>(
      "/ai/orchestration/registry",
      opts(token),
    ),

  getIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: Array<{ id: string; description: string }> }>(
      "/ai/orchestration/intents",
      opts(token),
    ),

  getHealth: (token: string) =>
    apiRequest<{ success: boolean; health: Array<{ agentId: string; name: string; status: string }> }>(
      "/ai/orchestration/health",
      opts(token),
    ),

  getObservability: (token: string) =>
    apiRequest<{ success: boolean; observability: { counts: Record<string, number>; successRate: number | null } }>(
      "/ai/orchestration/observability",
      opts(token),
    ),

  plan: (token: string, body: { query?: string; intent?: string }) =>
    apiRequest<{ success: boolean; plan: OrchestrationPlanStep[]; intent: string }>(
      "/ai/orchestration/plan",
      { ...opts(token), method: "POST", body },
    ),

  run: (token: string, body: { query?: string; intent?: string; simulation?: boolean }) =>
    apiRequest<{ success: boolean; execution: AgentExecution; awaitingApproval?: boolean; preview?: unknown }>(
      "/ai/orchestration/run",
      { ...opts(token), method: "POST", body },
    ),

  listExecutions: (token: string) =>
    apiRequest<{ success: boolean; executions: AgentExecution[] }>(
      "/ai/orchestration/executions",
      opts(token),
    ),

  getExecution: (token: string, id: string) =>
    apiRequest<{ success: boolean; execution: AgentExecution }>(
      `/ai/orchestration/executions/${id}`,
      opts(token),
    ),

  approve: (token: string, id: string) =>
    apiRequest<{ success: boolean; execution: AgentExecution }>(
      `/ai/orchestration/executions/${id}/approve`,
      { ...opts(token), method: "POST" },
    ),

  cancel: (token: string, id: string) =>
    apiRequest<{ success: boolean; execution: AgentExecution }>(
      `/ai/orchestration/executions/${id}/cancel`,
      { ...opts(token), method: "POST" },
    ),
};
