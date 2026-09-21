import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnListsPage = dynamic(
  () =>
    import("@/components/learn/learn-library").then(
      (mod) => mod.LearnListsPage,
    ),
  { loading: () => <RouteLoading label="Loading favorites" /> },
);

export const metadata: Metadata = {
  title: "Favourite Animations",
  description: "Saved educational animations",
};

export default function LearnFavoritesRoute() {
  return <LearnListsPage mode="favorites" />;
}
