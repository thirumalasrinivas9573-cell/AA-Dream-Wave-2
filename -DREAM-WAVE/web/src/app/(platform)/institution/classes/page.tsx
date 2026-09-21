import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const ClassesPage = dynamic(
  () =>
    import("@/components/institution/institution-entities").then((mod) => mod.ClassesPage),
  { loading: () => <RouteLoading label="Loading classes" /> },
);

export const metadata: Metadata = {
  title: "Classes",
  description: "Manage classes",
};

export default function Page() {
  return <ClassesPage />;
}
