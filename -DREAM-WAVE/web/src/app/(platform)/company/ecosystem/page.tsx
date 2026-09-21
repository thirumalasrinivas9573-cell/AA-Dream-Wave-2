"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const EcosystemIntelligencePage = dynamic(
  () =>
    import("@/components/ecosystem/ecosystem-intelligence-page").then(
      (m) => m.EcosystemIntelligencePage,
    ),
  { loading: () => <RouteLoading label="Loading ecosystem intelligence" /> },
);

export default function CompanyEcosystemPage() {
  return <EcosystemIntelligencePage portal="company" />;
}
