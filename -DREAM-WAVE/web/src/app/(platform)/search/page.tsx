import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const SmartSearchCenter = dynamic(
  () => import("@/components/search/smart-search-center").then((m) => m.SmartSearchCenter),
  { loading: () => <RouteLoading label="Loading smart search" /> },
);

export default function SearchPage() {
  return <SmartSearchCenter />;
}
