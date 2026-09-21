import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AcademicAnalytics = dynamic(
  () =>
    import("@/components/institution/academics/academic-insights").then(
      (module) => module.AcademicAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading academic analytics" /> },
);

export const metadata: Metadata = {
  title: "Academic Analytics",
  description: "Institution academic structure analytics",
};

export default function AcademicAnalyticsRoute() {
  return <AcademicAnalytics />;
}
