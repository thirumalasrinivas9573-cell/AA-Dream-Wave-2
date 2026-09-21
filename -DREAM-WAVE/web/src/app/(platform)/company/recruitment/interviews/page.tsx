import dynamic from "next/dynamic";

export default dynamic(
  () => import("@/components/company/recruitment/interview-management-page").then((m) => m.InterviewManagementPage),
  { loading: () => null },
);
