import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const StudentsPage = dynamic(
  () =>
    import("@/components/institution/students/student-management-page").then(
      (module) => module.StudentManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading student management" /> },
);

export const metadata: Metadata = {
  title: "Students",
  description: "Enterprise student management system",
};

export default function Page() {
  return <StudentsPage />;
}
