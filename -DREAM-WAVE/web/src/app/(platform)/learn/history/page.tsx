import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnListsPage = dynamic(
  () =>
    import("@/components/learn/learn-library").then(
      (mod) => mod.LearnListsPage,
    ),
  { loading: () => <RouteLoading label="Loading watch history" /> },
);

export const metadata: Metadata = {
  title: "Watch History",
  description: "Recently watched educational animations",
};

export default function LearnHistoryRoute() {
  return <LearnListsPage mode="history" />;
}
