"use client";

import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const Page = dynamic(
  () => import("@/components/company/recruitment/recruiter-match-talent-page").then((m) => m.RecruiterMatchTalentPage),
  { loading: () => <RouteLoading label="Loading match talent" /> },
);

export default function RecruiterMatchTalentRoute() {
  return <Page />;
}
