import type { PlatformNotification } from "@/types/partnership";

export function resolveNotificationHref(
  notification: PlatformNotification & { href?: string; metadata?: Record<string, unknown> },
): string | null {
  if (notification.href) return notification.href;
  const meta = notification.metadata || {};
  if (typeof meta.href === "string") return meta.href;
  if (meta.applicationId) return `/ai/career/jobs`;
  if (meta.source && meta.sourceId) return `/events/${meta.source}/${meta.sourceId}`;
  if (meta.postId) return `/community`;
  if (meta.teamId && meta.source && meta.sourceId) return `/events/${meta.source}/${meta.sourceId}`;
  if (meta.projectId) return `/research/${meta.projectId}`;
  return null;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function groupNotificationsByDay(
  items: (PlatformNotification & { href?: string })[],
): { label: string; items: typeof items }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems: typeof items = [];
  const yesterdayItems: typeof items = [];
  const earlierItems: typeof items = [];
  for (const item of items) {
    const d = new Date(item.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(item);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(item);
    else earlierItems.push(item);
  }
  const groups: { label: string; items: typeof items }[] = [];
  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });
  return groups;
}
