import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ApplicationListPage = dynamic(
  () =>
    import("@/components/company/recruitment/application-list-page").then(
      (m) => m.ApplicationListPage,
    ),
  { loading: () => <RouteLoading label="Loading applications" /> },
);

export const metadata: Metadata = {
  title: "Applications",
  description: "Company recruitment applications",
};

export default function Page() {
  return <ApplicationListPage />;
}
