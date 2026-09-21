"use client";

import dynamic from "next/dynamic";

const ProgramManagementPage = dynamic(
  () =>
    import("@/components/institution/programs/program-management-page").then(
      (m) => m.ProgramManagementPage,
    ),
  { loading: () => null },
);

export default function InstitutionProgramsPage() {
  return <ProgramManagementPage />;
}
