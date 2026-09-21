"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const Page = dynamic(
  () =>
    import("@/components/talent/institution-placement-intelligence-page").then(
      (m) => m.InstitutionPlacementIntelligencePage,
    ),
  { loading: () => <RouteLoading label="Loading placement intelligence" /> },
);

export default function InstitutionPlacementIntelligenceRoute() {
  return <Page />;
}
