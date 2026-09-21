import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AcademicReports = dynamic(
  () =>
    import("@/components/institution/academics/academic-insights").then(
      (module) => module.AcademicReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading academic reports" /> },
);

export const metadata: Metadata = {
  title: "Academic Reports",
  description: "Institution academic structure reports",
};

export default function AcademicReportsRoute() {
  return <AcademicReports />;
}
