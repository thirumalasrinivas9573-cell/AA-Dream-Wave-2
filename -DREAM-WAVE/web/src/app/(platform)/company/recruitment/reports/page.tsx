import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const RecruitmentReportsPage = dynamic(
  () =>
    import("@/components/company/recruitment/recruitment-insights").then(
      (m) => m.RecruitmentReportsPage,
    ),
  { loading: () => <RouteLoading label="Loading recruitment reports" /> },
);

export const metadata: Metadata = {
  title: "Recruitment Reports",
  description: "Company recruitment report center",
};

export default function Page() {
  return <RecruitmentReportsPage />;
}
