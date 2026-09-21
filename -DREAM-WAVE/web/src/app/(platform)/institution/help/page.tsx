import type { Metadata } from "next";

import { InstitutionPlaceholderPage } from "@/components/institution/institution-placeholder-page";

export const metadata: Metadata = {
  title: "Help",
  description: "Institution portal help center",
};

export default function HelpPage() {
  return (
    <InstitutionPlaceholderPage
      title="Help"
      description="Access institution support, operational guidance, and service status."
      nextRelease="A future institution support release"
    />
  );
}
