import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ReportCenterPage = dynamic(
  () =>
    import("@/components/institution/analytics/report-center-page").then((mod) => mod.ReportCenterPage),
  { loading: () => <RouteLoading label="Loading reports" /> },
);

export const metadata: Metadata = {
  title: "Institution Reports",
  description: "Institution report center with exports across every module",
};

export default function Page() {
  return <ReportCenterPage />;
}
