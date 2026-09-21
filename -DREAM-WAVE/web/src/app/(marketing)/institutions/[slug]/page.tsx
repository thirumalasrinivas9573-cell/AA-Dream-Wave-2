import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstitutionProfileView } from "@/components/discovery/institution-profile";
import {
  getInstitutionBySlug,
  INSTITUTION_DIRECTORY,
} from "@/constants/institution-directory";
import {
  buildInstitutionJsonLd,
  buildInstitutionMetadata,
} from "@/lib/institution-seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return INSTITUTION_DIRECTORY.map((institution) => ({ slug: institution.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const institution = getInstitutionBySlug(slug);
  if (!institution) {
    return { title: "Institution not found" };
  }
  return buildInstitutionMetadata(institution);
}

export default async function InstitutionProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const institution = getInstitutionBySlug(slug);
  if (!institution) {
    notFound();
  }

  const jsonLd = buildInstitutionJsonLd(institution);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InstitutionProfileView institution={institution} />
    </>
  );
}
