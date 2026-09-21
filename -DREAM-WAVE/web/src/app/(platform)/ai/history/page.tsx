import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiHistoryPage = dynamic(
  () =>
    import("@/components/ai/ai-history-page").then((mod) => mod.AiHistoryPage),
  { loading: () => <RouteLoading label="Loading AI history" /> },
);

export const metadata: Metadata = {
  title: "AI Prompt History",
  description: "Search and filter AI prompts",
};

export default function AiHistoryRoute() {
  return <AiHistoryPage />;
}
