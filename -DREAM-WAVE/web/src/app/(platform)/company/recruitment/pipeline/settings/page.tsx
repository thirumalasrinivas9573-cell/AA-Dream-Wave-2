import dynamic from "next/dynamic";

const PipelineSettingsPage = dynamic(
  () =>
    import("@/components/company/recruitment/pipeline-settings-page").then(
      (m) => m.PipelineSettingsPage,
    ),
  { loading: () => null },
);

export default function Page() {
  return <PipelineSettingsPage />;
}
