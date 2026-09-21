import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusManagementPage = dynamic(
  () =>
    import("@/components/institution/campus/campus-management-page").then(
      (mod) => mod.CampusManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading campus experience" /> },
);

export const metadata: Metadata = {
  title: "Campus Experience",
  description: "Announcements, events, clubs, gallery, and campus communication",
};

export default function Page() {
  return <CampusManagementPage initialTab="overview" />;
}
