import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const StudyGroupsPage = dynamic(
  () =>
    import("@/components/community/study-groups-page").then(
      (mod) => mod.StudyGroupsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading study groups" />,
  },
);

export const metadata: Metadata = {
  title: "Study Groups",
  description: "Collaborative study groups",
};

export default function StudyGroupsRoute() {
  return <StudyGroupsPage />;
}
