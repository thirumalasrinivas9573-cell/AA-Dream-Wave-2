import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const EventsDiscoveryPage = dynamic(
  () => import("@/components/events/events-discovery-page").then((m) => m.EventsDiscoveryPage),
  { loading: () => <RouteLoading label="Loading events" /> },
);

export const metadata: Metadata = {
  title: "Events & Hackathons",
  description: "Discover institution events, hackathons, workshops, and opportunities",
};

export default function EventsRoute() {
  return <EventsDiscoveryPage />;
}
