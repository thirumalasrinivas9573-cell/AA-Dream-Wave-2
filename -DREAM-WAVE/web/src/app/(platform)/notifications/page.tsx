import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const NotificationCenterPage = dynamic(
  () =>
    import("@/components/notifications/notification-center-page").then(
      (mod) => mod.NotificationCenterPage,
    ),
  { loading: () => <RouteLoading label="Loading notifications" /> },
);

export const metadata: Metadata = {
  title: "Notifications",
  description: "Platform notification center",
};

export default function NotificationsPage() {
  return <NotificationCenterPage />;
}
