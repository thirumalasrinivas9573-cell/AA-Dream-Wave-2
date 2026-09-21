import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ProjectIntelligenceDashboard = dynamic(
  () =>
    import("@/components/projects/project-intelligence-dashboard").then(
      (m) => m.ProjectIntelligenceDashboard,
    ),
  { loading: () => <RouteLoading label="Loading project builder" /> },
);

export default function ProjectIntelligencePage() {
  return <ProjectIntelligenceDashboard />;
}
