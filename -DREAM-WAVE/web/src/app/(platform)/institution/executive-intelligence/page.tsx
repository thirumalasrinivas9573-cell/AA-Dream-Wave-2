import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ExecutiveIntelligenceCenter = dynamic(
  () =>
    import("@/components/institution/executive/executive-intelligence-center").then(
      (m) => m.ExecutiveIntelligenceCenter,
    ),
  { loading: () => <RouteLoading label="Loading executive intelligence" /> },
);

export default function ExecutiveIntelligencePage() {
  return <ExecutiveIntelligenceCenter />;
}
