import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CollaborationHubPage = dynamic(
  () =>
    import("@/components/institution/partnerships/collaboration-hub-page").then(
      (m) => m.CollaborationHubPage,
    ),
  { loading: () => <RouteLoading label="Loading collaboration hub" /> },
);

export default function CompanyCollaborationHubPage() {
  return <CollaborationHubPage role="company" />;
}
