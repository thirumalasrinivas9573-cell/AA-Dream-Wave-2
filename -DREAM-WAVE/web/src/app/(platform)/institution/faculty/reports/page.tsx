import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const FacultyReports = dynamic(
  () =>
    import("@/components/institution/faculty/faculty-insights").then(
      (module) => module.FacultyReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading faculty reports" /> },
);

export const metadata: Metadata = {
  title: "Faculty Reports",
  description: "Institution faculty reports",
};

export default function FacultyReportsRoute() {
  return <FacultyReports />;
}
