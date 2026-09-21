import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const IndustryNetworkPage = dynamic(
  () =>
    import("@/components/institution/partnerships/industry-network-page").then(
      (mod) => mod.IndustryNetworkPage,
    ),
  { loading: () => <RouteLoading label="Loading industry network" /> },
);

export const metadata: Metadata = {
  title: "Industry Network",
  description: "Institution industry partnerships and company network",
};

export default function Page() {
  return <IndustryNetworkPage />;
}
