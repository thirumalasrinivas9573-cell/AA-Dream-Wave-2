import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const RecruitmentCommandCenter = dynamic(
  () =>
    import("@/components/company/recruitment/recruitment-command-center").then(
      (m) => m.RecruitmentCommandCenter,
    ),
  { loading: () => <RouteLoading label="Loading ATS" /> },
);

export const metadata: Metadata = {
  title: "Applicant Tracking",
  description: "Company applicant tracking system",
};

export default function Page() {
  return <RecruitmentCommandCenter />;
}
