import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PartnershipWorkspace = dynamic(
  () =>
    import("@/components/institution/partnerships/partnership-workspace").then(
      (mod) => mod.PartnershipWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading partnership" /> },
);

export const metadata: Metadata = {
  title: "Partnership",
  description: "Institution-company partnership workspace",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <PartnershipWorkspace
      partnershipId={id}
      portal="company"
      backHref="/company/institution-network"
    />
  );
}
