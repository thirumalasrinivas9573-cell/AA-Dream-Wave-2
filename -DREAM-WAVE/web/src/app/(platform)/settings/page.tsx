import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const SettingsPage = dynamic(
  () =>
    import("@/components/settings/settings-page").then(
      (mod) => mod.SettingsPage,
    ),
  { loading: () => <RouteLoading label="Loading settings" /> },
);

export const metadata: Metadata = {
  title: "Settings",
  description: "Account settings and preferences",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
