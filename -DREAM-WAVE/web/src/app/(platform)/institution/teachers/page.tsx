import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const TeachersPage = dynamic(
  () =>
    import("@/components/institution/institution-entities").then((mod) => mod.TeachersPage),
  { loading: () => <RouteLoading label="Loading teachers" /> },
);

export const metadata: Metadata = {
  title: "Teachers",
  description: "Manage teachers",
};

export default function Page() {
  return <TeachersPage />;
}
