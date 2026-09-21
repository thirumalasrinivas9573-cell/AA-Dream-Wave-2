import dynamic from "next/dynamic";

const CompanyProfilePage = dynamic(
  () =>
    import("@/components/company/recruitment/company-profile-page").then(
      (m) => m.CompanyProfilePage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <CompanyProfilePage />;
}
