import dynamic from "next/dynamic";

const ApplicantDirectoryPage = dynamic(
  () =>
    import("@/components/company/recruitment/applicant-directory-page").then(
      (m) => m.ApplicantDirectoryPage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <ApplicantDirectoryPage />;
}
