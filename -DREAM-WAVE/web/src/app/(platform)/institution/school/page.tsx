import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const SchoolDashboardPage = dynamic(
  () =>
    import("@/components/institution/campus-dashboards").then((mod) => mod.SchoolDashboardPage),
  { loading: () => <RouteLoading label="Loading school" /> },
);

export const metadata: Metadata = {
  title: "School Dashboard",
  description: "School operations dashboard",
};

export default function Page() {
  return <SchoolDashboardPage />;
}
