import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiOrchestrationCenter = dynamic(
  () => import("@/components/ai/orchestration/ai-orchestration-center").then((m) => m.AiOrchestrationCenter),
  { loading: () => <RouteLoading label="Loading AI orchestration" /> },
);

export default function AiOrchestrationPage() {
  return <AiOrchestrationCenter />;
}
