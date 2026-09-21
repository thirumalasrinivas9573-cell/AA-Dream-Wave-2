import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ProjectsPage = dynamic(
  () =>
    import("@/components/community/projects-page").then(
      (mod) => mod.ProjectsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading projects" />,
  },
);

export const metadata: Metadata = {
  title: "Projects",
  description: "Project collaboration dashboards",
};

export default function ProjectsRoute() {
  return <ProjectsPage />;
}
