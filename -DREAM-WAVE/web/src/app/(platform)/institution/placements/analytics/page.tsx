import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PlacementAnalytics = dynamic(
  () =>
    import("@/components/institution/placements/placement-insights").then(
      (module) => module.PlacementAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading placement analytics" /> },
);

export const metadata: Metadata = {
  title: "Placement Analytics",
  description: "Institution placement analytics",
};

export default function PlacementAnalyticsRoute() {
  return <PlacementAnalytics />;
}
