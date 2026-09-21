import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const OpportunitiesForYouPage = dynamic(
  () =>
    import("@/components/opportunities/opportunities-for-you-page").then(
      (mod) => mod.OpportunitiesForYouPage,
    ),
  { loading: () => <RouteLoading label="Loading opportunities" /> },
);

export const metadata: Metadata = {
  title: "Opportunities For You",
  description: "AI-powered explainable opportunity matching",
};

export default function OpportunitiesPage() {
  return <OpportunitiesForYouPage />;
}
