import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const StudentReports = dynamic(
  () =>
    import("@/components/institution/students/student-insights").then(
      (module) => module.StudentReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading student reports" /> },
);

export const metadata: Metadata = {
  title: "Student Reports",
  description: "Institution student reports",
};

export default function StudentReportsRoute() {
  return <StudentReports />;
}
