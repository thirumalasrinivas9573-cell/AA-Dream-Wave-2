import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CommunitiesPage = dynamic(
  () =>
    import("@/components/community/communities-page").then(
      (mod) => mod.CommunitiesPage,
    ),
  {
    loading: () => <RouteLoading label="Loading communities" />,
  },
);

export const metadata: Metadata = {
  title: "Communities",
  description: "Browse and join Dream Wave communities",
};

export default function CommunitiesRoute() {
  return <CommunitiesPage />;
}
