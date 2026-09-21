import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const StudentEventsDashboard = dynamic(
  () => import("@/components/events/student-events-dashboard").then((m) => m.StudentEventsDashboard),
  { loading: () => <RouteLoading label="Loading my events" /> },
);

export const metadata: Metadata = {
  title: "My Events",
  description: "Your registered and saved events",
};

export default function MyEventsRoute() {
  return <StudentEventsDashboard />;
}
