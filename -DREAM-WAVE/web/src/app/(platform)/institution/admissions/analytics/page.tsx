import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AdmissionsAnalytics = dynamic(
  () =>
    import("@/components/institution/admissions/admissions-insights").then(
      (module) => module.AdmissionsAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading admission analytics" /> },
);

export const metadata: Metadata = {
  title: "Admission Analytics",
  description: "Institution admission analytics",
};

export default function AdmissionAnalyticsRoute() {
  return <AdmissionsAnalytics />;
}
