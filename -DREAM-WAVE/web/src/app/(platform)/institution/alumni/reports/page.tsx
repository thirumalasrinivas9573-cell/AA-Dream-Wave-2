import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AlumniReports = dynamic(
  () =>
    import("@/components/institution/alumni/alumni-insights").then(
      (module) => module.AlumniReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading alumni reports" /> },
);

export const metadata: Metadata = {
  title: "Alumni Reports",
  description: "Institution alumni report center",
};

export default function AlumniReportsRoute() {
  return <AlumniReports />;
}
