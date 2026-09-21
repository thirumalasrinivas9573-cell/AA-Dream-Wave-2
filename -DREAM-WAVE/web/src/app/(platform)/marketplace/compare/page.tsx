"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const MarketplaceComparePage = dynamic(
  () => import("@/components/marketplace/marketplace-compare-page").then((m) => m.MarketplaceComparePage),
  { loading: () => <RouteLoading label="Loading comparison" /> },
);

export default function MarketplaceCompareRoute() {
  return (
    <Suspense fallback={<RouteLoading label="Loading comparison" />}>
      <MarketplaceComparePage />
    </Suspense>
  );
}
