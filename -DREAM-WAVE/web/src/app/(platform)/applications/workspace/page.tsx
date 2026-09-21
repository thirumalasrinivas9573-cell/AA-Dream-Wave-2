import dynamic from "next/dynamic";
import { RouteLoading } from "@/components/common/route-loading";

const ApplicationWorkspaceDashboard = dynamic(
  () => import("@/components/applications/application-workspace-dashboard").then((m) => m.ApplicationWorkspaceDashboard),
  { loading: () => <RouteLoading label="Loading applications" /> },
);

export default function ApplicationsWorkspacePage() {
  return <ApplicationWorkspaceDashboard />;
}
