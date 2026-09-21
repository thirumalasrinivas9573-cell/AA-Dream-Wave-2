import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const RecruitmentAnalyticsPage = dynamic(
  () =>
    import("@/components/company/recruitment/recruitment-insights").then(
      (m) => m.RecruitmentAnalyticsPage,
    ),
  { loading: () => <RouteLoading label="Loading recruitment analytics" /> },
);

export const metadata: Metadata = {
  title: "Recruitment Analytics",
  description: "Company recruitment analytics dashboard",
};

export default function Page() {
  return <RecruitmentAnalyticsPage />;
}
