import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionProfilePage = dynamic(
  () =>
    import("@/components/institution/institution-profile-settings").then((mod) => mod.InstitutionProfilePage),
  { loading: () => <RouteLoading label="Loading profile" /> },
);

export const metadata: Metadata = {
  title: "Institution Profile",
  description: "Institution organization profile",
};

export default function Page() {
  return <InstitutionProfilePage />;
}
