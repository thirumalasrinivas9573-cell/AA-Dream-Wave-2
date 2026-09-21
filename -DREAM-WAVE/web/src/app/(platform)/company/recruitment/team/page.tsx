import dynamic from "next/dynamic";

export default dynamic(
  () => import("@/components/company/recruitment/recruitment-team-page").then((m) => m.RecruitmentTeamPage),
  { loading: () => null },
);
