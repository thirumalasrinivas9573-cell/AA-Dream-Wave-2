import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const IntelligentOperationsCenter = dynamic(
  () =>
    import("@/components/operations/intelligent-operations-center").then(
      (m) => m.IntelligentOperationsCenter,
    ),
  { loading: () => <RouteLoading label="Loading operations center" /> },
);

export default function InstitutionOperationsPage() {
  return <IntelligentOperationsCenter />;
}
