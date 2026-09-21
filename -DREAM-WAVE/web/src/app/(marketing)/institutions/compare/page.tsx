import type { Metadata } from "next";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionCompare } from "@/components/discovery/institution-compare";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
  title: "Compare Institutions",
  description:
    "Compare up to four institutions side by side across academics, placements, fees, rankings and campus facilities.",
  alternates: { canonical: `${appConfig.url.replace(/\/$/, "")}/institutions/compare` },
};

export default function CompareInstitutionsPage() {
  return (
    <Suspense fallback={<RouteLoading label="Loading comparison" />}>
      <InstitutionCompare />
    </Suspense>
  );
}
