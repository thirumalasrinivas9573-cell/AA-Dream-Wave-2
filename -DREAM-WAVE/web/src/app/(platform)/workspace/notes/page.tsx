import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const WorkspaceNotesPage = dynamic(
  () =>
    import("@/components/workspace/workspace-notes").then(
      (mod) => mod.WorkspaceNotesPage,
    ),
  {
    loading: () => <RouteLoading label="Loading notes" />,
  },
);

export const metadata: Metadata = {
  title: "Smart Notes",
  description: "Markdown notes with AI summaries",
};

export default function Page() {
  return <WorkspaceNotesPage />;
}
