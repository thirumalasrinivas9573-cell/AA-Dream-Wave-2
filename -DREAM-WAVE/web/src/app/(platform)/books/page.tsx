import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const KnowledgeHome = dynamic(
  () =>
    import("@/components/knowledge/knowledge-home").then(
      (mod) => mod.KnowledgeHome,
    ),
  {
    loading: () => <RouteLoading label="Loading smart library" />,
  },
);

export const metadata: Metadata = {
  title: "Smart Library",
  description: "Dream Wave AI Knowledge & Smart Library Experience",
};

export default function BooksPage() {
  return <KnowledgeHome />;
}
