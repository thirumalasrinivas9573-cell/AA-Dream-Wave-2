import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const EventDetailsPage = dynamic(
  () => import("@/components/events/event-details-page").then((m) => m.EventDetailsPage),
  { loading: () => <RouteLoading label="Loading event details" /> },
);

export const metadata: Metadata = {
  title: "Event Details",
  description: "Event details, eligibility, and registration",
};

export default function EventDetailsRoute() {
  return <EventDetailsPage />;
}
