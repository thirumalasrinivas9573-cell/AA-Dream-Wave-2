import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusManagementPage = dynamic(
  () =>
    import("@/components/institution/campus/campus-management-page").then(
      (mod) => mod.CampusManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading announcements" /> },
);

export const metadata: Metadata = {
  title: "Announcements",
  description: "Institution announcement management",
};

export default function AnnouncementsPage() {
  return <CampusManagementPage initialTab="announcements" />;
}
