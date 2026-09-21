import type { Metadata } from "next";

import { StudentDetailPage } from "@/components/institution/students/student-detail-page";

export const metadata: Metadata = {
  title: "Student Profile",
  description: "Institution student intelligence profile",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <StudentDetailPage studentId={id} />;
}
