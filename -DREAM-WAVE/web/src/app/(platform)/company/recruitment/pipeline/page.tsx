import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PipelineKanbanPage = dynamic(
  () =>
    import("@/components/company/recruitment/pipeline-kanban-page").then(
      (m) => m.PipelineKanbanPage,
    ),
  { loading: () => <RouteLoading label="Loading pipeline" /> },
);

export const metadata: Metadata = {
  title: "Recruitment Pipeline",
  description: "Kanban recruitment pipeline",
};

export default function Page() {
  return <PipelineKanbanPage />;
}
