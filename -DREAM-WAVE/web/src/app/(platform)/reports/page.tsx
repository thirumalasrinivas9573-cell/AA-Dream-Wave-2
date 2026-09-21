import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ReportsWorkspace = dynamic(
  () =>
    import("@/components/student/reports-workspace").then(
      (mod) => mod.ReportsWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading reports" /> },
);

export const metadata: Metadata = {
  title: "Reports",
  description: "R&D career intelligence reports",
};

export default function ReportsPage() {
  return <ReportsWorkspace />;
}
