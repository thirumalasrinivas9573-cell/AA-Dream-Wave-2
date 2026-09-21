import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const IncubationManagementPage = dynamic(
  () =>
    import("@/components/institution/incubation/incubation-management-page").then(
      (m) => m.IncubationManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading incubation workspace" /> },
);

export const metadata: Metadata = {
  title: "Incubation Management",
  description: "Institution startup incubation and innovation ecosystem",
};

export default function Page() {
  return <IncubationManagementPage />;
}
