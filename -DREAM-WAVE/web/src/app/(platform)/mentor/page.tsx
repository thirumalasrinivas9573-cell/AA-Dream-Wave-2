import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const MentorWorkspace = dynamic(
  () =>
    import("@/components/student/mentor-workspace").then(
      (mod) => mod.MentorWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading mentor" /> },
);

export const metadata: Metadata = {
  title: "AI Mentor",
  description: "Chat with your Dream Wave AI mentor",
};

export default function MentorPage() {
  return <MentorWorkspace />;
}
