import dynamic from "next/dynamic";

const InternshipsManagementPage = dynamic(
  () =>
    import("@/components/company/recruitment/internships-management-page").then(
      (m) => m.InternshipsManagementPage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <InternshipsManagementPage />;
}
