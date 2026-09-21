import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const FacultyManagement = dynamic(
  () =>
    import("@/components/institution/faculty/faculty-management-page").then(
      (module) => module.FacultyManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading faculty management" /> },
);

export const metadata: Metadata = {
  title: "Faculty",
  description: "Enterprise faculty and staff management system",
};

export default function FacultyPage() {
  return <FacultyManagement />;
}
