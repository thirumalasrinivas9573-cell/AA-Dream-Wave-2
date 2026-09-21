"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useNotifications } from "@/components/providers/notification-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformNotificationsApi } from "@/lib/api/platform-notifications";
import { formatNotificationTime, groupNotificationsByDay, resolveNotificationHref } from "@/lib/notifications/deep-links";
import type { PlatformNotification } from "@/types/partnership";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "important";

export function NotificationCenterPage() {
  const { token } = useAuth();
  const { markRead, markAllRead, refresh, connectionState } = useNotifications();
  const [items, setItems] = useState<(PlatformNotification & { href?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: { limit: number; read?: "false"; priority?: string } = { limit: 50 };
      if (filter === "unread") params.read = "false";
      if (filter === "important") params.priority = "important";
      const res = await platformNotificationsApi.list(token, params);
      setItems(res.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && items.length === 0) return <RouteLoading label="Loading notifications" />;

  const groups = groupNotificationsByDay(items);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {connectionState === "connected" ? "Live updates enabled" : "Showing saved notifications"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "unread", "important"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-sm capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {items.length === 0 ? (
        <EmptyState title="You're all caught up" description="New updates will appear here when something relevant happens." />
      ) : (
        groups.map((group) => (
          <Card key={group.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.label}</CardTitle>
              <CardDescription>{group.items.length} notification(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((item) => {
                const href = resolveNotificationHref(item);
                const priority = (item as PlatformNotification & { metadata?: { priority?: string } }).metadata?.priority;
                return (
                  <article
                    key={item._id}
                    className={cn(
                      "border-border rounded-xl border px-4 py-3",
                      !item.read && "bg-muted/30 border-primary/20",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.read ? <Badge variant="default">Unread</Badge> : null}
                      {priority === "important" ? <Badge variant="secondary">Important</Badge> : null}
                      <Badge variant="outline">{item.type.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-2 font-medium">{item.title}</p>
                    {item.body ? <p className="text-muted-foreground mt-1 text-sm">{item.body}</p> : null}
                    <p className="text-muted-foreground mt-2 text-xs">{formatNotificationTime(item.createdAt)}</p>
                    <div className="mt-3 flex gap-2">
                      {href ? (
                        <Link
                          href={href}
                          className={buttonVariants({ size: "sm" })}
                          onClick={() => void markRead(item._id)}
                        >
                          Open
                        </Link>
                      ) : null}
                      {!item.read ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void markRead(item._id)}>
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      <Button type="button" variant="ghost" onClick={() => { void refresh(); void load(); }}>
        Refresh
      </Button>
    </div>
  );
}
