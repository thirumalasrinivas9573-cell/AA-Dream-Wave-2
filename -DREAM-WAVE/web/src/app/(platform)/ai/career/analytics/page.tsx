import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CareerAnalyticsPage = dynamic(
  () =>
    import("@/components/ai/career/career-analytics-page").then(
      (mod) => mod.CareerAnalyticsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading analytics" />,
  },
);

export const metadata: Metadata = {
  title: "Career Analytics",
  description: "Career growth and placement readiness analytics",
};

export default function CareerAnalyticsRoute() {
  return <CareerAnalyticsPage />;
}
