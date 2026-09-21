import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const OpportunityIntelligenceDetailPage = dynamic(
  () =>
    import("@/components/opportunities/opportunity-intelligence-detail-page").then(
      (m) => m.OpportunityIntelligenceDetailPage,
    ),
  { loading: () => <RouteLoading label="Loading opportunity" /> },
);

export default function OpportunityIntelligenceDetailRoute() {
  return <OpportunityIntelligenceDetailPage />;
}
