import { apiRequest } from "@/lib/api/client";
import type { Task, TaskResponse, TasksResponse } from "@/types/student";

export type CreateTaskPayload = {
  title: string;
  priority?: string;
  category?: string;
  goalId?: string;
  description?: string;
};

export type UpdateTaskPayload = {
  title?: string;
  priority?: string;
  completed?: boolean;
  goalId?: string | null;
};

export const tasksApi = {
  list: (token: string) =>
    apiRequest<TasksResponse>("/tasks", { method: "GET", token }),

  create: (payload: CreateTaskPayload, token: string) =>
    apiRequest<TaskResponse>("/tasks", {
      method: "POST",
      body: payload,
      token,
    }),

  update: (id: string, payload: UpdateTaskPayload, token: string) =>
    apiRequest<TaskResponse>(`/tasks/${id}`, {
      method: "PUT",
      body: payload,
      token,
    }),

  remove: (id: string, token: string) =>
    apiRequest<{ success: boolean }>(`/tasks/${id}`, {
      method: "DELETE",
      token,
    }),
};

export type { Task };
