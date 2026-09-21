import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusReports = dynamic(
  () =>
    import("@/components/institution/campus/campus-insights").then(
      (module) => module.CampusReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading campus reports" /> },
);

export const metadata: Metadata = {
  title: "Campus Reports",
  description: "Institution campus engagement reports",
};

export default function CampusReportsRoute() {
  return <CampusReports />;
}
