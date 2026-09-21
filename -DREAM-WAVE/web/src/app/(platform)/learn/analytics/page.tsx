import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnAnalyticsPage = dynamic(
  () =>
    import("@/components/learn/learn-analytics").then(
      (mod) => mod.LearnAnalyticsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading analytics" />,
  },
);

export const metadata: Metadata = {
  title: "Learning Analytics",
  description: "Adaptive learning progress, streaks, and achievements",
};

export default function Page() {
  return <LearnAnalyticsPage />;
}
