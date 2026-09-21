import dynamic from "next/dynamic";

const ShortlistPage = dynamic(
  () =>
    import("@/components/company/recruitment/shortlist-page").then(
      (m) => m.ShortlistPage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <ShortlistPage />;
}
