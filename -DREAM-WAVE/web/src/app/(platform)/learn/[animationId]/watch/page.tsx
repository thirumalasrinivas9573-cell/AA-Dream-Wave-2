import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";
import { getLearnAnimation } from "@/constants/learn-catalog";

const LearnWatchPage = dynamic(
  () =>
    import("@/components/learn/learn-watch").then((mod) => mod.LearnWatchPage),
  { loading: () => <RouteLoading label="Loading player" /> },
);

type Props = {
  params: Promise<{ animationId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { animationId } = await params;
  const animation = getLearnAnimation(animationId);
  return {
    title: animation ? `Watch · ${animation.title}` : "Watch animation",
    description: "Educational animation player",
  };
}

export default async function LearnWatchRoute({ params }: Props) {
  const { animationId } = await params;
  return <LearnWatchPage animationId={animationId} />;
}
