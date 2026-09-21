import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CommandCenter = dynamic(
  () =>
    import("@/components/institution/command-center/institution-command-center").then(
      (module) => module.InstitutionCommandCenter,
    ),
  { loading: () => <RouteLoading label="Loading command center" /> },
);

export const metadata: Metadata = {
  title: "Institution Command Center",
  description: "Cross-system institution intelligence and executive decision platform",
};

export default function CommandCenterRoute() {
  return <CommandCenter />;
}
