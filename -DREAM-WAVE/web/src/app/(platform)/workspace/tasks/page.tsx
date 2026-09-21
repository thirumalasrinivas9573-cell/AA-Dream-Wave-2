import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceTasksPage = dynamic(
  () =>
    import("@/components/workspace/workspace-tasks").then(
      (mod) => mod.WorkspaceTasksPage,
    ),
  {
    loading: () => <RouteLoading label="Loading tasks" />,
  },
);

export const metadata: Metadata = {
  title: "Workspace Tasks",
  description: "Smart task board with kanban and calendar views",
};

export default function Page() {
  return <WorkspaceTasksPage />;
}
