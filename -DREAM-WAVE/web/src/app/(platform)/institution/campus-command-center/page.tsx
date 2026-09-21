import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const SmartCampusCommandCenter = dynamic(
  () =>
    import("@/components/institution/campus/smart-campus-command-center").then(
      (m) => m.SmartCampusCommandCenter,
    ),
  { loading: () => <RouteLoading label="Loading campus command center" /> },
);

export default function CampusCommandCenterPage() {
  return <SmartCampusCommandCenter />;
}
