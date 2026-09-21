import type { Metadata } from "next";

import { DiscoveryExplorer } from "@/components/discovery/discovery-explorer";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
  title: "Discover Institutions",
  description:
    "Browse and compare verified colleges and universities by location, courses, fees, placements and rankings on Dream Wave.",
  alternates: { canonical: `${appConfig.url.replace(/\/$/, "")}/institutions` },
  openGraph: {
    title: "Discover Institutions · Dream Wave",
    description:
      "Explore verified institutions and compare programs, placements, fees and campus life.",
    type: "website",
  },
};

export default function InstitutionsDiscoveryPage() {
  return <DiscoveryExplorer />;
}
