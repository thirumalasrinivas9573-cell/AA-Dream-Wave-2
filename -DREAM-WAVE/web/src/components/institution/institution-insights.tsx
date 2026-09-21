"use client";

import { useEffect } from "react";

import { Spinner } from "@/components/common/spinner";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInstitutionStore } from "@/store/institution-store";

export function InstitutionNotificationsPage() {
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const notifications = useInstitutionStore((s) => s.notifications);
  const markNotificationRead = useInstitutionStore(
    (s) => s.markNotificationRead,
  );
  const markAllNotificationsRead = useInstitutionStore(
    (s) => s.markAllNotificationsRead,
  );

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading notifications" />
      </div>
    );
  }

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title="Notification center"
        description={`${unread} unread · ${notifications.length} total`}
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={unread === 0}
            onClick={() => markAllNotificationsRead()}
          >
            Mark all read
          </Button>
        }
      />

      <div className="space-y-3">
        {notifications.map((item) => (
          <Card
            key={item.id}
            className={item.read ? "opacity-80" : "ring-ring/40 ring-1"}
          >
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1">{item.body}</CardDescription>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {item.category} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.read ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => markNotificationRead(item.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
