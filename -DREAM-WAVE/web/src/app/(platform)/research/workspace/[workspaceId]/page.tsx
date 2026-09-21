import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchWorkspaceDashboard = dynamic(
  () =>
    import("@/components/research/research-workspace-dashboard").then(
      (m) => m.ResearchWorkspaceDashboard,
    ),
  { loading: () => <RouteLoading label="Loading research workspace" /> },
);

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export const metadata: Metadata = {
  title: "Research Workspace",
  description: "Evidence-first research workspace with synthesis and report builder",
};

export default async function ResearchWorkspaceDetailPage({ params }: PageProps) {
  const { workspaceId } = await params;
  return <ResearchWorkspaceDashboard workspaceId={workspaceId} />;
}
