import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const RoadmapWorkspace = dynamic(
  () =>
    import("@/components/student/roadmap-workspace").then(
      (mod) => mod.RoadmapWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading roadmap" /> },
);

export const metadata: Metadata = {
  title: "Roadmap",
  description: "AI career intelligence roadmap",
};

export default function RoadmapPage() {
  return (
    <Suspense fallback={<RouteLoading label="Loading roadmap" />}>
      <RoadmapWorkspace />
    </Suspense>
  );
}
