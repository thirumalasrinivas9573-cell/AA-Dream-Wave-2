import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const MembersPage = dynamic(
  () =>
    import("@/components/institution/institution-entities").then((mod) => mod.MembersPage),
  { loading: () => <RouteLoading label="Loading members" /> },
);

export const metadata: Metadata = {
  title: "Members",
  description: "Manage members",
};

export default function Page() {
  return <MembersPage />;
}
