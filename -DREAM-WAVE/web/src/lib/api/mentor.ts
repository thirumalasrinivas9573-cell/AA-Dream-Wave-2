import { apiRequest } from "@/lib/api/client";
import type {
  MentorChatResponse,
  MentorHistoryResponse,
  MentorMode,
} from "@/types/student";

export const mentorApi = {
  chat: (message: string, mode: MentorMode, token: string) =>
    apiRequest<MentorChatResponse>("/mentor/chat", {
      method: "POST",
      body: { message, mode },
      token,
    }),

  history: (mode: MentorMode, token: string) =>
    apiRequest<MentorHistoryResponse>(`/mentor/history?mode=${mode}`, {
      method: "GET",
      token,
    }),

  clearHistory: (mode: MentorMode, token: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/mentor/history?mode=${mode}`,
      {
        method: "DELETE",
        token,
      },
    ),
};
