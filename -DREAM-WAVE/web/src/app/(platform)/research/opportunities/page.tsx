import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchOpportunitiesBrowsePage = dynamic(
  () =>
    import("@/components/institution/research/research-portal-pages").then(
      (m) => m.ResearchOpportunitiesBrowsePage,
    ),
  { loading: () => <RouteLoading label="Loading opportunities" /> },
);

export const metadata: Metadata = {
  title: "Research Opportunities",
  description: "Browse and apply for research opportunities",
};

export default function Page() {
  return <ResearchOpportunitiesBrowsePage />;
}
