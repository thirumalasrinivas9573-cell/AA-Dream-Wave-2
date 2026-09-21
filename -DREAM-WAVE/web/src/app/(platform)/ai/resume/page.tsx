import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiResumePage = dynamic(
  () =>
    import("@/components/ai/ai-resume-page").then((mod) => mod.AiResumePage),
  { loading: () => <RouteLoading label="Loading resume assistant" /> },
);

export const metadata: Metadata = {
  title: "AI Resume Assistant",
  description: "Resume builder and analysis",
};

export default function AiResumeRoute() {
  return <AiResumePage />;
}
