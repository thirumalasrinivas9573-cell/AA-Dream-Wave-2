import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnLibraryPage = dynamic(
  () =>
    import("@/components/learn/learn-library").then(
      (mod) => mod.LearnLibraryPage,
    ),
  { loading: () => <RouteLoading label="Loading animation library" /> },
);

export const metadata: Metadata = {
  title: "Animation Library",
  description: "Browse educational animations by subject and topic",
};

export default function LearnLibraryRoute() {
  return <LearnLibraryPage />;
}
