import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PlacementReports = dynamic(
  () =>
    import("@/components/institution/placements/placement-insights").then(
      (module) => module.PlacementReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading placement reports" /> },
);

export const metadata: Metadata = {
  title: "Placement Reports",
  description: "Institution placement reports",
};

export default function PlacementReportsRoute() {
  return <PlacementReports />;
}
