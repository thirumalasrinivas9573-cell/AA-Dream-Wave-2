import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionOpportunityMarketplacePage = dynamic(
  () =>
    import("@/components/marketplace/institution-opportunity-marketplace-page").then(
      (m) => m.InstitutionOpportunityMarketplacePage,
    ),
  { loading: () => <RouteLoading label="Loading campus marketplace" /> },
);

export default function Page() {
  return <InstitutionOpportunityMarketplacePage />;
}
