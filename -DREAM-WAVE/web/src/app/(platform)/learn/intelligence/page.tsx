import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const AdaptiveLearningDashboard = dynamic(
  () =>
    import("@/components/learn/adaptive-learning-dashboard").then(
      (m) => m.AdaptiveLearningDashboard,
    ),
  { loading: () => <RouteLoading label="Loading adaptive learning" /> },
);

export default function AdaptiveLearningPage() {
  return <AdaptiveLearningDashboard />;
}
