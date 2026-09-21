import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionSettingsPage = dynamic(
  () =>
    import("@/components/institution/institution-profile-settings").then((mod) => mod.InstitutionSettingsPage),
  { loading: () => <RouteLoading label="Loading settings" /> },
);

export const metadata: Metadata = {
  title: "Organization Settings",
  description: "Institution organization settings",
};

export default function Page() {
  return <InstitutionSettingsPage />;
}
