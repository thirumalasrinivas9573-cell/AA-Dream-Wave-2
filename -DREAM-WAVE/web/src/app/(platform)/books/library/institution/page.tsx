import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LibraryScopePage = dynamic(
  () =>
    import("@/components/knowledge/library-scope-page").then((mod) => mod.LibraryScopePage),
  { loading: () => <RouteLoading label="Loading library" /> },
);

export const metadata: Metadata = {
  title: "Institution Library",
  description: "institution library books",
};

export default function Page() {
  return <LibraryScopePage scope="institution" />;
}
