import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const KnowledgeExplorerPage = dynamic(
  () =>
    import("@/components/knowledge/knowledge-explorer").then(
      (mod) => mod.KnowledgeExplorerPage,
    ),
  {
    loading: () => <RouteLoading label="Loading explorer" />,
  },
);

export const metadata: Metadata = {
  title: "Knowledge Explorer",
  description: "Concept trees, topic maps, and learning graphs",
};

export default function Page() {
  return (
    <Suspense fallback={<RouteLoading label="Loading explorer" />}>
      <KnowledgeExplorerPage />
    </Suspense>
  );
}
