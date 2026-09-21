import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnDashboardPage = dynamic(
  () =>
    import("@/components/learn/learn-dashboard").then(
      (mod) => mod.LearnDashboardPage,
    ),
  {
    loading: () => <RouteLoading label="Loading adaptive learning" />,
  },
);

export const metadata: Metadata = {
  title: "Adaptive Learning",
  description: "Interactive educational animation studio",
};

export default function LearnPage() {
  return <LearnDashboardPage />;
}
