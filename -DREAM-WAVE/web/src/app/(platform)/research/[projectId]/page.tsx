import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchWorkspacePage = dynamic(
  () =>
    import("@/components/research/research-workspace").then(
      (mod) => mod.ResearchWorkspacePage,
    ),
  {
    loading: () => <RouteLoading label="Loading research workspace" />,
  },
);

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata: Metadata = {
  title: "Research Project",
  description: "Smart research editor and collaboration workspace",
};

export default async function ResearchProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ResearchWorkspacePage projectId={projectId} />;
}
