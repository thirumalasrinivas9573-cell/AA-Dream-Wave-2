import dynamic from "next/dynamic";

export default dynamic(
  () => import("@/components/company/recruitment/talent-discovery-page").then((m) => m.TalentDiscoveryPage),
  { loading: () => null },
);
