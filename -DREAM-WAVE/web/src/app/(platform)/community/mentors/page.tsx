import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const MentorsPage = dynamic(
  () =>
    import("@/components/community/mentors-page").then(
      (mod) => mod.MentorsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading mentors" />,
  },
);

export const metadata: Metadata = {
  title: "Mentors",
  description: "Community mentor experience",
};

export default function MentorsRoute() {
  return <MentorsPage />;
}
