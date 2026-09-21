import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CommunityHomePage = dynamic(
  () =>
    import("@/components/community/community-home").then(
      (mod) => mod.CommunityHomePage,
    ),
  {
    loading: () => <RouteLoading label="Loading community" />,
  },
);

export const metadata: Metadata = {
  title: "Community",
  description: "AI Community & Collaboration Experience",
};

export default function CommunityRoute() {
  return <CommunityHomePage />;
}
