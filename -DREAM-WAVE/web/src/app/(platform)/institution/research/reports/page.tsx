import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchReports = dynamic(
  () =>
    import("@/components/institution/research/research-insights").then(
      (module) => module.ResearchReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading research reports" /> },
);

export const metadata: Metadata = {
  title: "Research Reports",
  description: "Institution research and innovation report center",
};

export default function ResearchReportsRoute() {
  return <ResearchReports />;
}
