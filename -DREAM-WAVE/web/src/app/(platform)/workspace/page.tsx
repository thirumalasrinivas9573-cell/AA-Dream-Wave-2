import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceHomePage = dynamic(
  () =>
    import("@/components/workspace/workspace-home").then(
      (mod) => mod.WorkspaceHomePage,
    ),
  {
    loading: () => <RouteLoading label="Loading workspace" />,
  },
);

export const metadata: Metadata = {
  title: "Smart Workspace",
  description: "Personal Productivity & Smart Workspace Experience",
};

export default function Page() {
  return <WorkspaceHomePage />;
}
