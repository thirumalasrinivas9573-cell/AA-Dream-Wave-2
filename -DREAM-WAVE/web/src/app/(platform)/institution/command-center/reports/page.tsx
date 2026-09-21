import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ExecutiveReports = dynamic(
  () =>
    import("@/components/institution/command-center/executive-report-center").then(
      (module) => module.ExecutiveReportCenter,
    ),
  { loading: () => <RouteLoading label="Loading executive reports" /> },
);

export const metadata: Metadata = {
  title: "Executive Reports",
  description: "Institution executive report center",
};

export default function ExecutiveReportsRoute() {
  return <ExecutiveReports />;
}
