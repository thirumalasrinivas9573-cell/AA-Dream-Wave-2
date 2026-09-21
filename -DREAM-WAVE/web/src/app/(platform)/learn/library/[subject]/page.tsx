import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const LearnLibraryPage = dynamic(
  () =>
    import("@/components/learn/learn-library").then(
      (mod) => mod.LearnLibraryPage,
    ),
  { loading: () => <RouteLoading label="Loading subject library" /> },
);

type Props = {
  params: Promise<{ subject: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  return {
    title: `${subject} animations`,
    description: `Educational animations for ${subject}`,
  };
}

export default async function LearnSubjectRoute({ params }: Props) {
  const { subject } = await params;
  return <LearnLibraryPage subjectFilter={subject} />;
}
