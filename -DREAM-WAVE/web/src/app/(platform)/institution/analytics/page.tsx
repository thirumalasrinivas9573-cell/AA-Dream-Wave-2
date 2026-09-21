import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CommandCenter = dynamic(
  () =>
    import("@/components/institution/command-center/institution-command-center").then(
      (module) => module.InstitutionCommandCenter,
    ),
  { loading: () => <RouteLoading label="Loading institution intelligence" /> },
);

export const metadata: Metadata = {
  title: "Institution Intelligence",
  description: "Enterprise analytics and decision intelligence center",
};

export default function AnalyticsRoute() {
  return <CommandCenter />;
}
