import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const DiscussionsPage = dynamic(
  () =>
    import("@/components/community/discussions-page").then(
      (mod) => mod.DiscussionsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading discussions" />,
  },
);

export const metadata: Metadata = {
  title: "Discussions",
  description: "Community discussion feed",
};

export default function DiscussionsRoute() {
  return <DiscussionsPage />;
}
