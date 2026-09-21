import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiRoadmapBuilderPage = dynamic(
  () =>
    import("@/components/ai/ai-roadmap-page").then(
      (mod) => mod.AiRoadmapBuilderPage,
    ),
  { loading: () => <RouteLoading label="Loading roadmap builder" /> },
);

export const metadata: Metadata = {
  title: "AI Roadmap Generator",
  description: "Build phased learning roadmaps",
};

export default function AiRoadmapRoute() {
  return <AiRoadmapBuilderPage />;
}
