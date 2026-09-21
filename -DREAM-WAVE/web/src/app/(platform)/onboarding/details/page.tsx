import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const OnboardingDetailsForm = dynamic(
  () =>
    import("@/components/onboarding/onboarding-details-form").then((mod) => mod.OnboardingDetailsForm),
  { loading: () => <RouteLoading label="Loading details" /> },
);

export const metadata: Metadata = {
  title: "Complete setup",
  description: "Finish your Dream Wave onboarding",
};

export default function Page() {
  return <OnboardingDetailsForm />;
}
