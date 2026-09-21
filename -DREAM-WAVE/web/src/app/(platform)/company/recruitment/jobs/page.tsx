import dynamic from "next/dynamic";

const JobsManagementPage = dynamic(
  () =>
    import("@/components/company/recruitment/jobs-management-page").then(
      (m) => m.JobsManagementPage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <JobsManagementPage />;
}
