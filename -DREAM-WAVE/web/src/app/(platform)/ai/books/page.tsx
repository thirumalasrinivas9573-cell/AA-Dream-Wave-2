import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiBookAssistantPage = dynamic(
  () =>
    import("@/components/ai/ai-book-assistant-page").then(
      (mod) => mod.AiBookAssistantPage,
    ),
  { loading: () => <RouteLoading label="Loading book assistant" /> },
);

export const metadata: Metadata = {
  title: "AI Book Assistant",
  description: "Book chat and reading recommendations",
};

export default function AiBooksRoute() {
  return <AiBookAssistantPage />;
}
