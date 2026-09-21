import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceFocusPage = dynamic(
  () =>
    import("@/components/workspace/workspace-focus").then(
      (mod) => mod.WorkspaceFocusPage,
    ),
  {
    loading: () => <RouteLoading label="Loading focus tools" />,
  },
);

export const metadata: Metadata = {
  title: "Focus Mode",
  description: "Pomodoro timer and AI productivity tools",
};

export default function Page() {
  return <WorkspaceFocusPage />;
}
