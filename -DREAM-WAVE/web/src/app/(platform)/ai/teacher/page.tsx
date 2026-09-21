import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AiTeacherPage = dynamic(
  () =>
    import("@/components/ai/ai-teacher-page").then((mod) => mod.AiTeacherPage),
  { loading: () => <RouteLoading label="Loading AI Teacher" /> },
);

export const metadata: Metadata = {
  title: "AI Teacher",
  description: "Interactive subject lessons",
};

export default function AiTeacherRoute() {
  return <AiTeacherPage />;
}
