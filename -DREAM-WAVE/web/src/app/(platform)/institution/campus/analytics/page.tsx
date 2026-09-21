import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusAnalytics = dynamic(
  () =>
    import("@/components/institution/campus/campus-insights").then(
      (module) => module.CampusAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading campus analytics" /> },
);

export const metadata: Metadata = {
  title: "Campus Analytics",
  description: "Institution campus engagement analytics",
};

export default function CampusAnalyticsRoute() {
  return <CampusAnalytics />;
}
