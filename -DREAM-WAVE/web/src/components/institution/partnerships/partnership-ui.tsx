"use client";

import Link from "next/link";

import { BadgeCheck, Building2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PARTNERSHIP_STATUS_LABELS } from "@/constants/partnership";
import { cn } from "@/lib/utils";
import type { OrgSummary, Partnership, PartnershipStatus } from "@/types/partnership";

export function PartnershipStatusBadge({ status }: { status: PartnershipStatus | string }) {
  const variant =
    status === "active"
      ? "default"
      : status === "pending" || status === "invited"
        ? "secondary"
        : "outline";

  return (
    <Badge variant={variant}>
      {PARTNERSHIP_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function OrgLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn("size-12 rounded-xl object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

type CompanyPartnerCardProps = {
  company: OrgSummary;
  partnership?: Partnership | null | undefined;
  activeJobs?: number;
  activeInternships?: number;
  upcomingDrives?: number;
  onView?: (() => void) | undefined;
  onManage?: (() => void) | undefined;
  onRequest?: (() => void) | undefined;
  partnershipHref?: string | undefined;
};

export function CompanyPartnerCard({
  company,
  partnership,
  activeJobs = 0,
  activeInternships = 0,
  upcomingDrives = 0,
  onView,
  onManage,
  onRequest,
  partnershipHref,
}: CompanyPartnerCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <OrgLogo name={company.name} {...(company.logoUrl ? { logoUrl: company.logoUrl } : {})} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate text-base">{company.name}</CardTitle>
            {company.verified ? (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="size-3" aria-hidden="true" />
                Verified
              </Badge>
            ) : null}
          </div>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {company.industry ? <span>{company.industry}</span> : null}
            {company.location || company.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {company.location || company.city}
              </span>
            ) : null}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {partnership ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{partnership.relationshipType}</Badge>
            <PartnershipStatusBadge status={partnership.status} />
          </div>
        ) : null}
        <dl className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <dt className="text-muted-foreground">Jobs</dt>
            <dd className="font-semibold">{activeJobs || company.activeJobsCount || 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Internships</dt>
            <dd className="font-semibold">
              {activeInternships || company.activeInternshipsCount || 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Drives</dt>
            <dd className="font-semibold">{upcomingDrives}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {onView ? (
            <Button size="sm" variant="outline" onClick={onView}>
              View Company
            </Button>
          ) : null}
          {partnershipHref ? (
            <Link href={partnershipHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
              View Partnership
            </Link>
          ) : null}
          {onManage && partnership ? (
            <Button size="sm" onClick={onManage}>
              Manage Partnership
            </Button>
          ) : null}
          {onRequest && !partnership ? (
            <Button size="sm" onClick={onRequest}>
              Send Request
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type InstitutionPartnerCardProps = {
  institution: OrgSummary;
  partnership?: Partnership | null | undefined;
  onView?: (() => void) | undefined;
  onManage?: (() => void) | undefined;
  onRequest?: (() => void) | undefined;
  partnershipHref?: string | undefined;
};

export function InstitutionPartnerCard({
  institution,
  partnership,
  onView,
  onManage,
  onRequest,
  partnershipHref,
}: InstitutionPartnerCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <OrgLogo name={institution.name} {...(institution.logoUrl ? { logoUrl: institution.logoUrl } : {})} />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{institution.name}</CardTitle>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {institution.type ? (
              <span className="capitalize">{institution.type}</span>
            ) : null}
            {institution.city || institution.country ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {[institution.city, institution.country].filter(Boolean).join(", ")}
              </span>
            ) : null}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {institution.departments?.length ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            Departments: {institution.departments.slice(0, 4).join(", ")}
          </p>
        ) : null}
        {institution.programs?.length ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            Programs: {institution.programs.slice(0, 4).join(", ")}
          </p>
        ) : null}
        {partnership ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{partnership.relationshipType}</Badge>
            <PartnershipStatusBadge status={partnership.status} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {onView ? (
            <Button size="sm" variant="outline" onClick={onView}>
              View Institution
            </Button>
          ) : null}
          {partnershipHref ? (
            <Link href={partnershipHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
              View Partnership
            </Link>
          ) : null}
          {onManage && partnership ? (
            <Button size="sm" onClick={onManage}>
              Manage Partnership
            </Button>
          ) : null}
          {onRequest && !partnership ? (
            <Button size="sm" onClick={onRequest}>
              Send Request
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PartnershipMetricGrid({
  stats,
  variant = "institution",
}: {
  stats: {
    totalIndustryPartners?: number;
    activePartners?: number;
    recruitmentPartners?: number;
    internshipPartners?: number;
    researchPartners?: number;
    pendingInvitations?: number;
    partnerInstitutions?: number;
    pendingRequests?: number;
    recruitmentInstitutions?: number;
    internshipInstitutions?: number;
    recentlyConnected?: number;
  };
  variant?: "institution" | "company";
}) {
  const items =
    variant === "institution"
      ? [
          { label: "Industry Partners", value: stats.totalIndustryPartners ?? stats.activePartners ?? 0 },
          { label: "Active Partners", value: stats.activePartners ?? 0 },
          { label: "Recruitment Partners", value: stats.recruitmentPartners ?? 0 },
          { label: "Internship Partners", value: stats.internshipPartners ?? 0 },
          { label: "Research Partners", value: stats.researchPartners ?? 0 },
          { label: "Pending Invitations", value: stats.pendingInvitations ?? 0 },
        ]
      : [
          { label: "Partner Institutions", value: stats.partnerInstitutions ?? 0 },
          { label: "Pending Requests", value: stats.pendingRequests ?? 0 },
          { label: "Recruitment Institutions", value: stats.recruitmentInstitutions ?? 0 },
          { label: "Internship Institutions", value: stats.internshipInstitutions ?? 0 },
          { label: "Research Partners", value: stats.researchPartners ?? 0 },
          { label: "Recently Connected", value: stats.recentlyConnected ?? 0 },
        ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{item.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function resolveOrgFromPartnership(
  partnership: Partnership,
  side: "institution" | "company",
): OrgSummary {
  if (side === "company") {
    const c = partnership.company ?? partnership.companyId;
    if (typeof c === "object" && c !== null) return c as OrgSummary;
    return { _id: String(c), name: "Company" };
  }
  const i = partnership.institution ?? partnership.institutionId;
  if (typeof i === "object" && i !== null) return i as OrgSummary;
  return { _id: String(i), name: "Institution" };
}

export function getPartnershipId(partnership: Partnership): string {
  return partnership.id || partnership._id || "";
}

export function getOrgId(org: OrgSummary | string): string {
  if (typeof org === "string") return org;
  return org._id;
}

export function NetworkEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <Building2 className="text-muted-foreground size-10" aria-hidden="true" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
    </div>
  );
}
