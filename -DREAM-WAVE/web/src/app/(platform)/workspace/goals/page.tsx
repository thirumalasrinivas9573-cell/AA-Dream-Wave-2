import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceGoalsPage = dynamic(
  () =>
    import("@/components/workspace/workspace-goals").then(
      (mod) => mod.WorkspaceGoalsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading goals" />,
  },
);

export const metadata: Metadata = {
  title: "Workspace Goals",
  description: "Long-term and short-term goal management",
};

export default function Page() {
  return <WorkspaceGoalsPage />;
}
