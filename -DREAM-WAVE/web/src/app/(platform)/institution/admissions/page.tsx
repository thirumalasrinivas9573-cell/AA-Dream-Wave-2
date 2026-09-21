import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AdmissionsWorkspace = dynamic(
  () =>
    import("@/components/institution/admissions/admissions-page").then(
      (module) => module.AdmissionsPage,
    ),
  { loading: () => <RouteLoading label="Loading admissions" /> },
);

export const metadata: Metadata = {
  title: "Admissions",
  description: "Institution admissions management",
};

export default function AdmissionsPage() {
  return <AdmissionsWorkspace />;
}
