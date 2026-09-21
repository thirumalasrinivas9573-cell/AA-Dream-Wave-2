import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AdmissionsReports = dynamic(
  () =>
    import("@/components/institution/admissions/admissions-insights").then(
      (module) => module.AdmissionsReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading admission reports" /> },
);

export const metadata: Metadata = {
  title: "Admission Reports",
  description: "Institution admission reports",
};

export default function AdmissionReportsRoute() {
  return <AdmissionsReports />;
}
