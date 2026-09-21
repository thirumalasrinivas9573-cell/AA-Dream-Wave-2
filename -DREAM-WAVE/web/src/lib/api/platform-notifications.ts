import { apiRequest } from "@/lib/api/client";
import type { PlatformNotification } from "@/types/partnership";

export type NotificationPreferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  categories: Record<string, boolean>;
};

export const platformNotificationsApi = {
  list: (
    token: string,
    params?: { page?: number; limit?: number; read?: "true" | "false"; type?: string; priority?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.read) search.set("read", params.read);
    if (params?.type) search.set("type", params.type);
    if (params?.priority) search.set("priority", params.priority);
    const q = search.toString();
    return apiRequest<{
      success: boolean;
      notifications: (PlatformNotification & { href?: string; metadata?: Record<string, unknown> })[];
      unreadCount: number;
      pagination: { total: number; page: number; pageCount: number };
    }>(`/platform-notifications${q ? `?${q}` : ""}`, { token });
  },

  unreadCount: (token: string) =>
    apiRequest<{ success: boolean; count: number }>("/platform-notifications/unread-count", { token }),

  getOne: (token: string, id: string) =>
    apiRequest<{ success: boolean; notification: PlatformNotification & { href?: string } }>(
      `/platform-notifications/${id}`,
      { token },
    ),

  resolveLink: (token: string, id: string) =>
    apiRequest<{ success: boolean; href: string | null }>(`/platform-notifications/${id}/link`, { token }),

  markRead: (token: string, id: string) =>
    apiRequest(`/platform-notifications/${id}/read`, { method: "PATCH", token }),

  markAllRead: (token: string) =>
    apiRequest("/platform-notifications/read-all", { method: "POST", token }),

  remove: (token: string, id: string) =>
    apiRequest(`/platform-notifications/${id}`, { method: "DELETE", token }),

  getPreferences: (token: string) =>
    apiRequest<{ success: boolean; preferences: NotificationPreferences }>(
      "/platform-notifications/preferences",
      { token },
    ),

  updatePreferences: (token: string, body: Partial<NotificationPreferences>) =>
    apiRequest<{ success: boolean; preferences: NotificationPreferences }>(
      "/platform-notifications/preferences",
      { method: "PATCH", token, body },
    ),
};

export { platformNotificationsApi as notificationsApi };
