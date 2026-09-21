import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchHomePage = dynamic(
  () =>
    import("@/components/research/research-home").then(
      (mod) => mod.ResearchHomePage,
    ),
  {
    loading: () => <RouteLoading label="Loading research home" />,
  },
);

export const metadata: Metadata = {
  title: "AI Research Workspace",
  description: "Dream Wave AI Research & Innovation Workspace",
};

export default function ResearchPage() {
  return <ResearchHomePage />;
}
