import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AlumniManagement = dynamic(
  () =>
    import("@/components/institution/alumni/alumni-management-page").then(
      (module) => module.AlumniManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading alumni network" /> },
);

export const metadata: Metadata = {
  title: "Alumni Network",
  description: "Institution alumni directory and professional community",
};

export default function AlumniRoute() {
  return <AlumniManagement />;
}
