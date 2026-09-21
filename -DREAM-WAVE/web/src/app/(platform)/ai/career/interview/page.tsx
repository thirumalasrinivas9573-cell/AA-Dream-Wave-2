import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CareerInterviewPage = dynamic(
  () =>
    import("@/components/ai/career/career-interview-page").then(
      (mod) => mod.CareerInterviewPage,
    ),
  {
    loading: () => <RouteLoading label="Loading interview studio" />,
  },
);

export const metadata: Metadata = {
  title: "Career Interviews",
  description: "AI mock interview practice",
};

export default function CareerInterviewRoute() {
  return <CareerInterviewPage />;
}
