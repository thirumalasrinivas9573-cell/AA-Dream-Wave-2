"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PlacementIntelligenceCenter = dynamic(
  () =>
    import("@/components/talent/placement-intelligence-center").then(
      (m) => m.PlacementIntelligenceCenter,
    ),
  { loading: () => <RouteLoading label="Loading placement intelligence" /> },
);

export default function StudentPlacementIntelligencePage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <PlacementIntelligenceCenter />
    </div>
  );
}
