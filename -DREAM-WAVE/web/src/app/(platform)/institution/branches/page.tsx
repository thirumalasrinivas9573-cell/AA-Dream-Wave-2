import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const BranchesPage = dynamic(
  () =>
    import("@/components/institution/institution-entities").then((mod) => mod.BranchesPage),
  { loading: () => <RouteLoading label="Loading branches" /> },
);

export const metadata: Metadata = {
  title: "Branches",
  description: "Manage branches",
};

export default function Page() {
  return <BranchesPage />;
}
