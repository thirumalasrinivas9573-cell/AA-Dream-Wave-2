import type { Metadata } from "next";

import { TalentDiscoveryPage } from "@/components/institution/students/talent-discovery-page";

export const metadata: Metadata = {
  title: "Talent Discovery",
  description: "Discover placement-ready students",
};

export default function Page() {
  return <TalentDiscoveryPage />;
}
