import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";
import { getLearnAnimation } from "@/constants/learn-catalog";

const LearnDetailPage = dynamic(
  () =>
    import("@/components/learn/learn-detail").then((mod) => mod.LearnDetailPage),
  { loading: () => <RouteLoading label="Loading animation" /> },
);

type Props = {
  params: Promise<{ animationId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { animationId } = await params;
  const animation = getLearnAnimation(animationId);
  return {
    title: animation?.title || "Animation",
    description: animation?.description || "Educational animation details",
  };
}

export default async function LearnDetailRoute({ params }: Props) {
  const { animationId } = await params;
  return <LearnDetailPage animationId={animationId} />;
}
