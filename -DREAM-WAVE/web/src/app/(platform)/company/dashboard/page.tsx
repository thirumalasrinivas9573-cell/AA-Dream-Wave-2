import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CompanyPortalDashboard = dynamic(
  () =>
    import("@/components/company/company-portal-dashboard").then(
      (mod) => mod.CompanyPortalDashboard,
    ),
  { loading: () => <RouteLoading label="Loading company dashboard" /> },
);

export const metadata: Metadata = {
  title: "Company Dashboard",
  description: "Company enterprise dashboard and partnerships",
};

export default function Page() {
  return <CompanyPortalDashboard />;
}
