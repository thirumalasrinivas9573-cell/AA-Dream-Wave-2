import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AlumniAnalytics = dynamic(
  () =>
    import("@/components/institution/alumni/alumni-insights").then(
      (module) => module.AlumniAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading alumni analytics" /> },
);

export const metadata: Metadata = {
  title: "Alumni Analytics",
  description: "Institution alumni and community analytics",
};

export default function AlumniAnalyticsRoute() {
  return <AlumniAnalytics />;
}
