import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchManagementPage = dynamic(
  () =>
    import("@/components/institution/research/research-management-page").then(
      (m) => m.ResearchManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading research workspace" /> },
);

export const metadata: Metadata = {
  title: "Research & Innovation",
  description: "Institution research management workspace",
};

export default function Page() {
  return <ResearchManagementPage />;
}
