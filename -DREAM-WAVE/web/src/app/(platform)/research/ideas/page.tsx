import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const InnovationIdeaSubmitPage = dynamic(
  () =>
    import("@/components/institution/research/research-portal-pages").then(
      (m) => m.InnovationIdeaSubmitPage,
    ),
  { loading: () => <RouteLoading label="Loading innovation portal" /> },
);

export const metadata: Metadata = {
  title: "Submit Innovation Idea",
  description: "Submit startup and research innovation ideas",
};

export default function Page() {
  return <InnovationIdeaSubmitPage />;
}
