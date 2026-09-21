import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const OpportunityIntelligenceDashboard = dynamic(
  () =>
    import("@/components/opportunities/opportunity-intelligence-dashboard").then(
      (m) => m.OpportunityIntelligenceDashboard,
    ),
  { loading: () => <RouteLoading label="Loading opportunity intelligence" /> },
);

export default function OpportunityIntelligencePage() {
  return <OpportunityIntelligenceDashboard />;
}
