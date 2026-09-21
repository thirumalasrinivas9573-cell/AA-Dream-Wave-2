import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceInsightsPage = dynamic(
  () =>
    import("@/components/workspace/workspace-insights").then(
      (mod) => mod.WorkspaceInsightsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading insights" />,
  },
);

export const metadata: Metadata = {
  title: "Workspace Insights",
  description: "Personal productivity dashboard and achievements",
};

export default function Page() {
  return <WorkspaceInsightsPage />;
}
