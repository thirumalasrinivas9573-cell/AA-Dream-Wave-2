import dynamic from "next/dynamic";
import { RouteLoading } from "@/components/common/route-loading";

const ApplicationWorkspacePage = dynamic(
  () => import("@/components/applications/application-workspace-page").then((m) => m.ApplicationWorkspacePage),
  { loading: () => <RouteLoading label="Loading workspace" /> },
);

export default function ApplicationWorkspaceDetailPage() {
  return <ApplicationWorkspacePage />;
}
