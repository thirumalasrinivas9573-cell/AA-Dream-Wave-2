import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AcademicManagementPage = dynamic(
  () =>
    import("@/components/institution/academics/academic-management-page").then(
      (mod) => mod.AcademicManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading academic structure" /> },
);

export const metadata: Metadata = {
  title: "Academic Structure",
  description: "Manage departments, programs, courses, subjects, and curriculum",
};

export default function Page() {
  return <AcademicManagementPage initialTab="overview" />;
}
