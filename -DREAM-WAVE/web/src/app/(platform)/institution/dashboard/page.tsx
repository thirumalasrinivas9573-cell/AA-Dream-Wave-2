import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionDashboardPage = dynamic(
  () =>
    import("@/components/institution/institution-dashboard").then((mod) => mod.InstitutionDashboardPage),
  { loading: () => <RouteLoading label="Loading dashboard" /> },
);

export const metadata: Metadata = {
  title: "Institution Dashboard",
  description: "Institution operations dashboard",
};

export default function Page() {
  return <InstitutionDashboardPage />;
}
