import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ResearchModeCenter = dynamic(
  () => import("@/components/search/research-mode-center").then((m) => m.ResearchModeCenter),
  { loading: () => <RouteLoading label="Loading research mode" /> },
);

export default function ResearchModePage() {
  return <ResearchModeCenter />;
}
