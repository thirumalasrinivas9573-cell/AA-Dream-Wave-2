import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const GoalsWorkspace = dynamic(
  () =>
    import("@/components/student/goals-workspace").then(
      (mod) => mod.GoalsWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading goals" /> },
);

export const metadata: Metadata = {
  title: "Goals",
  description: "Set and manage your Dream Wave learning goals",
};

export default function GoalsPage() {
  return <GoalsWorkspace />;
}
