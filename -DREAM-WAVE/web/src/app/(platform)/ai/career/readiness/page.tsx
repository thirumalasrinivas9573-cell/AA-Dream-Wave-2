import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CareerReadinessDashboard = dynamic(
  () =>
    import("@/components/ai/career/career-readiness-dashboard").then(
      (m) => m.CareerReadinessDashboard,
    ),
  { loading: () => <RouteLoading label="Loading career readiness" /> },
);

export default function CareerReadinessPage() {
  return <CareerReadinessDashboard />;
}
