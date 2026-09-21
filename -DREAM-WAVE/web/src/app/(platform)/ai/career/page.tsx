import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiCareerPage = dynamic(
  () =>
    import("@/components/ai/ai-career-page").then((mod) => mod.AiCareerPage),
  {
    loading: () => <RouteLoading label="Loading career intelligence" />,
  },
);

export const metadata: Metadata = {
  title: "AI Career Intelligence",
  description: "Personalized career guidance, jobs, interviews, and placement insights",
};

export default function AiCareerRoute() {
  return <AiCareerPage />;
}
