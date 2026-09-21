import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchWorkspaceListPage = dynamic(
  () =>
    import("@/components/research/research-workspace-list").then(
      (m) => m.ResearchWorkspaceListPage,
    ),
  { loading: () => <RouteLoading label="Loading research workspaces" /> },
);

export default function ResearchWorkspaceIndexPage() {
  return <ResearchWorkspaceListPage />;
}
