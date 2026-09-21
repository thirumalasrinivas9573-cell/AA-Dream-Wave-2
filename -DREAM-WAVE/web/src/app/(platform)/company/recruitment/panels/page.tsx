import dynamic from "next/dynamic";

export default dynamic(
  () => import("@/components/company/recruitment/interview-panels-page").then((m) => m.InterviewPanelsPage),
  { loading: () => null },
);
