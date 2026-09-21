import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const BookReaderPage = dynamic(
  () =>
    import("@/components/knowledge/book-reader-page").then(
      (mod) => mod.BookReaderPage,
    ),
  { loading: () => <RouteLoading label="Opening reader" /> },
);

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  return {
    title: `Read ${bookId}`,
    description: "Book reader",
  };
}

export default async function Page({ params }: PageProps) {
  const { bookId } = await params;
  return <BookReaderPage bookId={bookId} />;
}
