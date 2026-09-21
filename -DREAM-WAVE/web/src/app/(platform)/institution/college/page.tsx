import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CollegeDashboardPage = dynamic(
  () =>
    import("@/components/institution/campus-dashboards").then((mod) => mod.CollegeDashboardPage),
  { loading: () => <RouteLoading label="Loading college" /> },
);

export const metadata: Metadata = {
  title: "College Dashboard",
  description: "College operations dashboard",
};

export default function Page() {
  return <CollegeDashboardPage />;
}
