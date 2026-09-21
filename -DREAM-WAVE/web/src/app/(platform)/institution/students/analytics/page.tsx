import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const StudentAnalytics = dynamic(
  () =>
    import("@/components/institution/students/student-insights").then(
      (module) => module.StudentAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading student analytics" /> },
);

export const metadata: Metadata = {
  title: "Student Analytics",
  description: "Institution student analytics",
};

export default function StudentAnalyticsRoute() {
  return <StudentAnalytics />;
}
