import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusManagementPage = dynamic(
  () =>
    import("@/components/institution/campus/campus-management-page").then(
      (mod) => mod.CampusManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading events" /> },
);

export const metadata: Metadata = {
  title: "Events",
  description: "Institution event management",
};

export default function EventsPage() {
  return <CampusManagementPage initialTab="events" />;
}
