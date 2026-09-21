import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const PersonalizationCenter = dynamic(
  () => import("@/components/personalization/personalization-center").then((m) => m.PersonalizationCenter),
  { loading: () => <RouteLoading label="Loading personalization center" /> },
);

export default function PersonalizationPage() {
  return <PersonalizationCenter />;
}
