import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AcademicManagementPage = dynamic(
  () =>
    import("@/components/institution/academics/academic-management-page").then(
      (mod) => mod.AcademicManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading subjects" /> },
);

export const metadata: Metadata = {
  title: "Subjects",
  description: "Manage academic subjects",
};

export default function Page() {
  return <AcademicManagementPage initialTab="subjects" />;
}
