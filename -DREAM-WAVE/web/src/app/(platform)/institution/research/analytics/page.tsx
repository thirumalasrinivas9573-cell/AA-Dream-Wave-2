import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchAnalytics = dynamic(
  () =>
    import("@/components/institution/research/research-insights").then(
      (module) => module.ResearchAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading research analytics" /> },
);

export const metadata: Metadata = {
  title: "Research Analytics",
  description: "Institution research and innovation analytics",
};

export default function ResearchAnalyticsRoute() {
  return <ResearchAnalytics />;
}
