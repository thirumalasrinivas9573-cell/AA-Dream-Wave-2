"use client";

import Link from "next/link";
import { Bell, Wifi, WifiOff } from "lucide-react";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSocketEvent } from "@/components/providers/socket-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Z_INDEX } from "@/constants";
import { platformNotificationsApi } from "@/lib/api/platform-notifications";
import { formatNotificationTime, resolveNotificationHref } from "@/lib/notifications/deep-links";
import type { PlatformNotification } from "@/types/partnership";
import { cn } from "@/lib/utils";

export type AppNotification = PlatformNotification & {
  href?: string;
  metadata?: Record<string, unknown>;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  connectionState: "connected" | "disconnected" | "connecting" | "reconnecting";
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushNotification: (input: AppNotification) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const StableTree = memo(function StableTree({ children }: { children: ReactNode }) {
  return children;
});

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [] as AppNotification[],
      unreadCount: 0,
      loading: false,
      connectionState: "disconnected" as const,
      refresh: async () => undefined,
      markRead: async () => undefined,
      markAllRead: async () => undefined,
      pushNotification: () => undefined,
    };
  }
  return ctx;
}

type RealtimePayload = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  href?: string;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<NotificationContextValue["connectionState"]>("disconnected");

  const refresh = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await platformNotificationsApi.list(token, { limit: 30 });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      /* keep existing state on failure */
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pushNotification = useCallback((input: AppNotification) => {
    setNotifications((prev) => {
      const exists = prev.some((n) => n._id === input._id);
      if (exists) return prev;
      return [input, ...prev].slice(0, 50);
    });
    if (!input.read) setUnreadCount((c) => c + 1);
  }, []);

  useSocketEvent<RealtimePayload>("platform:notification", (payload) => {
    if (!payload?.id) return;
    pushNotification({
      _id: payload.id,
      type: payload.type,
      title: payload.title,
      body: payload.body || "",
      read: payload.read ?? false,
      createdAt: payload.createdAt || new Date().toISOString(),
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
      ...(payload.href ? { href: payload.href } : {}),
    });
    setConnectionState("connected");
  });

  useEffect(() => {
    if (!isAuthenticated) setConnectionState("disconnected");
  }, [isAuthenticated]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      await platformNotificationsApi.markRead(token, id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await platformNotificationsApi.markAllRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [token]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      connectionState,
      refresh,
      markRead,
      markAllRead,
      pushNotification,
    }),
    [connectionState, loading, markAllRead, markRead, notifications, pushNotification, refresh, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      <StableTree>{children}</StableTree>
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, connectionState, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative"
        onClick={() => {
          setOpen(true);
          void refresh();
        }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span
            className="bg-primary text-primary-foreground fade-in absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px]"
            style={{ zIndex: Z_INDEX.toast }}
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Notifications"
        description="Important updates from your Dream Wave activity."
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {connectionState === "connected" ? (
              <>
                <Wifi className="size-3.5" aria-hidden="true" />
                <span>Live updates</span>
              </>
            ) : (
              <>
                <WifiOff className="size-3.5" aria-hidden="true" />
                <span>Offline — showing saved notifications</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 ? (
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void markAllRead()}>
                Mark all read
              </Button>
            ) : null}
            <Link href="/notifications" className={buttonVariants({ size: "sm", variant: "ghost", className: "h-8" })}>
              View all
            </Link>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">You&apos;re all caught up.</p>
          ) : (
            notifications.slice(0, 10).map((item) => {
              const href = resolveNotificationHref(item);
              return (
                <article
                  key={item._id}
                  className={cn(
                    "border-border interactive-surface rounded-xl border px-3 py-2",
                    !item.read && "bg-muted/40 border-primary/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.body ? (
                        <p className="text-muted-foreground mt-1 text-xs text-pretty">{item.body}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {formatNotificationTime(item.createdAt)}
                      </p>
                    </div>
                    {!item.read ? (
                      <span className="bg-primary mt-1 size-2 shrink-0 rounded-full" aria-label="Unread" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {href ? (
                      <Link
                        href={href}
                        className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 text-xs" })}
                        onClick={() => {
                          void markRead(item._id);
                          setOpen(false);
                        }}
                      >
                        Open
                      </Link>
                    ) : null}
                    {!item.read ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => void markRead(item._id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Dialog>
    </>
  );
}
