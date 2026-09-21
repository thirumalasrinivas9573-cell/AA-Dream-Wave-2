import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceCalendarPage = dynamic(
  () =>
    import("@/components/workspace/workspace-calendar").then(
      (mod) => mod.WorkspaceCalendarPage,
    ),
  {
    loading: () => <RouteLoading label="Loading calendar" />,
  },
);

export const metadata: Metadata = {
  title: "Workspace Calendar",
  description: "Study, interview, and assignment scheduling",
};

export default function Page() {
  return <WorkspaceCalendarPage />;
}
