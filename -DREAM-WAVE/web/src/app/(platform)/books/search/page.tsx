import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const KnowledgeSearchPage = dynamic(
  () =>
    import("@/components/knowledge/knowledge-lists").then(
      (mod) => mod.KnowledgeSearchPage,
    ),
  { loading: () => <RouteLoading label="Loading smart search" /> },
);

export const metadata: Metadata = {
  title: "Smart Search",
  description: "Search the Dream Wave knowledge catalog",
};

export default function Page() {
  return (
    <Suspense fallback={<RouteLoading label="Loading smart search" />}>
      <KnowledgeSearchPage />
    </Suspense>
  );
}
