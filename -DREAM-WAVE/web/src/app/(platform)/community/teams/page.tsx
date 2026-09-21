import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const TeamsPage = dynamic(
  () =>
    import("@/components/community/teams-page").then((mod) => mod.TeamsPage),
  {
    loading: () => <RouteLoading label="Loading teams" />,
  },
);

export const metadata: Metadata = {
  title: "Teams",
  description: "Team collaboration workspaces",
};

export default function TeamsRoute() {
  return <TeamsPage />;
}
