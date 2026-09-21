"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const Page = dynamic(
  () => import("@/components/marketplace/marketplace-browse-page").then((m) => m.MarketplaceBrowsePage),
  { loading: () => <RouteLoading label="Loading marketplace" /> },
);

export default function MarketplaceRoute() {
  return <Page />;
}
