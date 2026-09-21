import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InstitutionNetworkPage = dynamic(
  () =>
    import("@/components/company/institution-network-page").then(
      (mod) => mod.InstitutionNetworkPage,
    ),
  { loading: () => <RouteLoading label="Loading institution network" /> },
);

export const metadata: Metadata = {
  title: "Institution Network",
  description: "Company institution partnerships and campus collaboration",
};

export default function Page() {
  return <InstitutionNetworkPage />;
}
