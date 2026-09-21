import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AcademicManagementPage = dynamic(
  () =>
    import("@/components/institution/academics/academic-management-page").then(
      (mod) => mod.AcademicManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading departments" /> },
);

export const metadata: Metadata = {
  title: "Departments",
  description: "Manage academic departments",
};

export default function Page() {
  return <AcademicManagementPage initialTab="departments" />;
}
