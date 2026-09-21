import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const TasksWorkspace = dynamic(
  () =>
    import("@/components/student/tasks-workspace").then(
      (mod) => mod.TasksWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading tasks" /> },
);

export const metadata: Metadata = {
  title: "Tasks",
  description: "Track Dream Wave learning tasks",
};

export default function TasksPage() {
  return <TasksWorkspace />;
}
