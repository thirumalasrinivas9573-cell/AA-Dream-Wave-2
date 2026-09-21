import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { RouteLoading } from "@/components/common/route-loading";

const CampusManagementPage = dynamic(
  () =>
    import("@/components/institution/campus/campus-management-page").then(
      (mod) => mod.CampusManagementPage,
    ),
  { loading: () => <RouteLoading label="Loading gallery" /> },
);

export const metadata: Metadata = {
  title: "Gallery",
  description: "Institution gallery management",
};

export default function GalleryPage() {
  return <CampusManagementPage initialTab="gallery" />;
}
