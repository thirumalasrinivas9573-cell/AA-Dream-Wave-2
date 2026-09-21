"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const Page = dynamic(
  () => import("@/components/marketplace/opportunity-match-detail-page").then((m) => m.OpportunityMatchDetailPage),
  { loading: () => <RouteLoading label="Loading match detail" /> },
);

export default function MatchDetailRoute() {
  return <Page />;
}
