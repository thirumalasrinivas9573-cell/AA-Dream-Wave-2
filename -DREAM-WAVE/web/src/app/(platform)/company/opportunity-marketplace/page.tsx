import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CompanyOpportunityMarketplacePage = dynamic(
  () =>
    import("@/components/marketplace/company-opportunity-marketplace-page").then(
      (m) => m.CompanyOpportunityMarketplacePage,
    ),
  { loading: () => <RouteLoading label="Loading company marketplace" /> },
);

export default function Page() {
  return <CompanyOpportunityMarketplacePage />;
}
