"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const Page = dynamic(
  () =>
    import("@/components/talent/company-talent-intelligence-page").then(
      (m) => m.CompanyTalentIntelligencePage,
    ),
  { loading: () => <RouteLoading label="Loading talent intelligence" /> },
);

export default function CompanyTalentIntelligenceRoute() {
  return <Page />;
}
