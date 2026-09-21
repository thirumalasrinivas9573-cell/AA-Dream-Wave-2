import type { Metadata } from "next";

import { appConfig } from "@/config/app.config";
import { INSTITUTION_TYPE_LABELS } from "@/constants/institution-directory";
import type { InstitutionProfile } from "@/types/institution-discovery";

const BASE_URL = appConfig.url.replace(/\/$/, "");

export function institutionCanonical(slug: string) {
  return `${BASE_URL}/institutions/${slug}`;
}

export function buildInstitutionMetadata(
  institution: InstitutionProfile,
): Metadata {
  const typeLabel = INSTITUTION_TYPE_LABELS[institution.type];
  const title = `${institution.name} — ${typeLabel} in ${institution.location.city}`;
  const description = `${institution.overview} Rated ${institution.rating}/5 with ${institution.stats.placementRate}% placements. Explore programs, faculty, campus life and admissions.`;
  const url = institutionCanonical(institution.slug);
  const keywords = [
    institution.name,
    institution.shortName,
    `${typeLabel} college`,
    `${typeLabel} in ${institution.location.city}`,
    ...institution.departments.map((department) => `${department} program`),
    "admissions",
    "placements",
    "campus life",
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: appConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Schema.org CollegeOrUniversity structured data for rich results.
 */
export function buildInstitutionJsonLd(institution: InstitutionProfile) {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: institution.name,
    alternateName: institution.shortName,
    description: institution.overview,
    url: institutionCanonical(institution.slug),
    foundingDate: String(institution.established),
    telephone: institution.phone,
    email: institution.email,
    sameAs: Object.values(institution.social).filter(Boolean),
    address: {
      "@type": "PostalAddress",
      streetAddress: institution.location.address,
      addressLocality: institution.location.city,
      addressRegion: institution.location.state,
      postalCode: institution.location.pincode,
      addressCountry: institution.location.country,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: institution.rating,
      reviewCount: institution.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  };
}
