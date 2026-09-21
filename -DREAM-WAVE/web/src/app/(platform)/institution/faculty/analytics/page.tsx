import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const FacultyAnalytics = dynamic(
  () =>
    import("@/components/institution/faculty/faculty-insights").then(
      (module) => module.FacultyAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading faculty analytics" /> },
);

export const metadata: Metadata = {
  title: "Faculty Analytics",
  description: "Institution faculty analytics",
};

export default function FacultyAnalyticsRoute() {
  return <FacultyAnalytics />;
}
