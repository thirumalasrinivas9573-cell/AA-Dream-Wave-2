import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const HistoryPage = dynamic(
  () =>
    import("@/components/knowledge/knowledge-lists").then(
      (mod) => mod.HistoryPage,
    ),
  { loading: () => <RouteLoading label="Loading history" /> },
);

export const metadata: Metadata = {
  title: "Reading History",
  description: "Book reading history",
};

export default function Page() {
  return (
    <Suspense fallback={<RouteLoading label="Loading history" />}>
      <HistoryPage />
    </Suspense>
  );
}
