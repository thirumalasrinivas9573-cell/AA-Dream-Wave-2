import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ApplicationWorkspace = dynamic(
  () =>
    import("@/components/company/recruitment/application-workspace").then(
      (m) => m.ApplicationWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading application" /> },
);

export const metadata: Metadata = {
  title: "Application",
  description: "Recruitment application workspace",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ApplicationWorkspace applicationId={id} />;
}
