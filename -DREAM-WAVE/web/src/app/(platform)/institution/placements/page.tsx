import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PlacementManagementPage = dynamic(
  () =>
    import("@/components/institution/placements/placement-management-page").then(
      (mod) => mod.PlacementManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading placement management" /> },
);

export const metadata: Metadata = {
  title: "Placements",
  description: "Institution placement, internship, and recruiter management",
};

export default function Page() {
  return <PlacementManagementPage initialTab="overview" />;
}
