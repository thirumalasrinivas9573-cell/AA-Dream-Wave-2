import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const RoleSelectionForm = dynamic(
  () =>
    import("@/components/onboarding/role-selection-form").then((mod) => mod.RoleSelectionForm),
  { loading: () => <RouteLoading label="Loading onboarding" /> },
);

export const metadata: Metadata = {
  title: "Choose your role",
  description: "Select how you will use Dream Wave",
};

export default function Page() {
  return <RoleSelectionForm />;
}
