import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CareerCopilotCenter = dynamic(
  () => import("@/components/ai/career/career-copilot-center").then((m) => m.CareerCopilotCenter),
  { loading: () => <RouteLoading label="Loading career copilot" /> },
);

export default function CareerCopilotPage() {
  return <CareerCopilotCenter />;
}
