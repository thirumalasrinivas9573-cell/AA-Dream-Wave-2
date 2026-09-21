import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const MessagesPage = dynamic(
  () =>
    import("@/components/community/messages-page").then(
      (mod) => mod.MessagesPage,
    ),
  {
    loading: () => <RouteLoading label="Loading messages" />,
  },
);

export const metadata: Metadata = {
  title: "Messages",
  description: "Community messaging",
};

export default function MessagesRoute() {
  return <MessagesPage />;
}
