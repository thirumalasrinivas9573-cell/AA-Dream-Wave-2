import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const BookDetailPage = dynamic(
  () =>
    import("@/components/knowledge/book-detail-page").then(
      (mod) => mod.BookDetailPage,
    ),
  { loading: () => <RouteLoading label="Loading book" /> },
);

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  return {
    title: bookId,
    description: "Book details",
  };
}

export default async function Page({ params }: PageProps) {
  const { bookId } = await params;
  return <BookDetailPage bookId={bookId} />;
}
