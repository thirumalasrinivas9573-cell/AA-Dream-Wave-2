import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CareerJobsPage = dynamic(
  () =>
    import("@/components/ai/career/career-jobs-page").then(
      (mod) => mod.CareerJobsPage,
    ),
  {
    loading: () => <RouteLoading label="Loading jobs" />,
  },
);

export const metadata: Metadata = {
  title: "Career Jobs",
  description: "AI job and internship matching",
};

export default function CareerJobsRoute() {
  return <CareerJobsPage />;
}
