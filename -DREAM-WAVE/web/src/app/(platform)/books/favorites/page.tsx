import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RouteLoading } from "@/components/common/route-loading";

const FavoritesPage = dynamic(
  () =>
    import("@/components/knowledge/knowledge-lists").then(
      (mod) => mod.FavoritesPage,
    ),
  { loading: () => <RouteLoading label="Loading favorites" /> },
);

export const metadata: Metadata = {
  title: "Favorites",
  description: "Favorite books",
};

export default function Page() {
  return (
    <Suspense fallback={<RouteLoading label="Loading favorites" />}>
      <FavoritesPage />
    </Suspense>
  );
}
