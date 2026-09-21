import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionNotificationsPage = dynamic(
  () =>
    import("@/components/institution/institution-insights").then((mod) => mod.InstitutionNotificationsPage),
  { loading: () => <RouteLoading label="Loading notifications" /> },
);

export const metadata: Metadata = {
  title: "Notifications",
  description: "Institution notifications",
};

export default function Page() {
  return <InstitutionNotificationsPage />;
}
