import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiHubPage = dynamic(
  () => import("@/components/ai/ai-hub-page").then((mod) => mod.AiHubPage),
  { loading: () => <RouteLoading label="Loading AI Studio" /> },
);

export const metadata: Metadata = {
  title: "AI Platform",
  description: "Dream Wave AI Studio",
};

export default function AiPlatformPage() {
  return <AiHubPage />;
}
