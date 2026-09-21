import dynamic from "next/dynamic";

const ProgramWorkspace = dynamic(
  () =>
    import("@/components/institution/programs/program-workspace").then((m) => m.ProgramWorkspace),
  { loading: () => null },
);

export default async function InstitutionProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ProgramWorkspace
      programId={id}
      backHref="/institution/programs"
      portal="institution"
    />
  );
}
