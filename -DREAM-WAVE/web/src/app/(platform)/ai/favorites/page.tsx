import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiHistoryPage = dynamic(
  () =>
    import("@/components/ai/ai-history-page").then((mod) => mod.AiHistoryPage),
  { loading: () => <RouteLoading label="Loading favorites" /> },
);

export const metadata: Metadata = {
  title: "AI Favorite Prompts",
  description: "Starred prompts across AI tools",
};

export default function AiFavoritesRoute() {
  return <AiHistoryPage favoritesOnly />;
}
