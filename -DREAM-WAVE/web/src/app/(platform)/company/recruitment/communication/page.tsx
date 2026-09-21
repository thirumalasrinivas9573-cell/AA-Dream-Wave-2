import dynamic from "next/dynamic";

export default dynamic(
  () => import("@/components/company/recruitment/communication-center-page").then((m) => m.CommunicationCenterPage),
  { loading: () => null },
);
