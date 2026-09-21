"use client";

import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ScrollText,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  DiscoverySection,
  InfoRow,
  LogoBadge,
  RatingStars,
  StatTile,
  TypeBadge,
  VerificationBadge,
} from "@/components/discovery/discovery-ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DISCOVERY_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type {
  DiscoveryGalleryItem,
  InstitutionProfile,
  ReviewAudience,
} from "@/types/institution-discovery";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "programs", label: "Programs" },
  { id: "placements", label: "Placements" },
  { id: "faculty", label: "Faculty" },
  { id: "campus", label: "Campus Life" },
  { id: "achievements", label: "Achievements" },
  { id: "reviews", label: "Reviews" },
  { id: "admission", label: "Admission" },
];

const GALLERY_FILTERS: Array<{ value: DiscoveryGalleryItem["category"] | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "campus", label: "Campus" },
  { value: "labs", label: "Labs" },
  { value: "library", label: "Library" },
  { value: "sports", label: "Sports" },
  { value: "hostel", label: "Hostel" },
  { value: "events", label: "Events" },
];

const REVIEW_FILTERS: Array<{ value: ReviewAudience | "all"; label: string }> = [
  { value: "all", label: "All reviews" },
  { value: "student", label: "Students" },
  { value: "alumni", label: "Alumni" },
  { value: "company", label: "Companies" },
];

export function InstitutionProfileView({ institution }: { institution: InstitutionProfile }) {
  const [galleryFilter, setGalleryFilter] = useState<DiscoveryGalleryItem["category"] | "all">("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewAudience | "all">("all");

  const gallery = useMemo(
    () =>
      galleryFilter === "all"
        ? institution.gallery
        : institution.gallery.filter((item) => item.category === galleryFilter),
    [galleryFilter, institution.gallery],
  );

  const reviews = useMemo(
    () =>
      reviewFilter === "all"
        ? institution.reviews
        : institution.reviews.filter((review) => review.audience === reviewFilter),
    [institution.reviews, reviewFilter],
  );

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <ProfileHero institution={institution} />

      <nav
        aria-label="Institution sections"
        className="border-border bg-background/90 sticky top-16 z-10 border-b backdrop-blur"
      >
        <div className="container-app flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-app space-y-16 py-12">
        <OverviewSection institution={institution} />
        <ProgramsSection institution={institution} />
        <PlacementsSection institution={institution} />
        <FacultySection institution={institution} />
        <CampusSection
          institution={institution}
          gallery={gallery}
          galleryFilter={galleryFilter}
          onGalleryFilter={setGalleryFilter}
        />
        <AchievementsSection institution={institution} />
        <ReviewsSection
          institution={institution}
          reviews={reviews}
          reviewFilter={reviewFilter}
          onReviewFilter={setReviewFilter}
        />
        <AdmissionSection institution={institution} />
      </div>
    </main>
  );
}

function ProfileHero({ institution }: { institution: InstitutionProfile }) {
  return (
    <header className="relative isolate overflow-hidden">
      <div className="from-primary/25 via-primary/10 to-background absolute inset-0 -z-10 bg-gradient-to-br" aria-hidden="true" />
      <div className="container-app py-12 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <LogoBadge initials={institution.logoInitials} size="lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={institution.type} />
              {institution.verified ? <VerificationBadge /> : null}
              {institution.rankings.map((ranking) => (
                <Badge key={ranking.label} variant="outline">
                  {ranking.label} {ranking.rank}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {institution.name}
            </h1>
            <p className="text-muted-foreground text-base">{institution.tagline}</p>
            <div className="flex flex-wrap items-center gap-4">
              <RatingStars value={institution.rating} count={institution.reviewCount} size="md" />
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <MapPin className="size-4" aria-hidden="true" />
                {institution.location.city}, {institution.location.state}
              </span>
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Calendar className="size-4" aria-hidden="true" />
                Est. {institution.established}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href="#admission" className={buttonVariants()}>
                Apply now
              </a>
              <Link
                href={`${DISCOVERY_ROUTES.compare}?ids=${institution.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Add to compare
              </Link>
              <a
                href={institution.website}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <Globe aria-hidden="true" />
                Website
              </a>
            </div>
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatTile label="Students" value={institution.stats.students.toLocaleString()} />
          <StatTile label="Faculty" value={institution.stats.faculty} />
          <StatTile label="Departments" value={institution.stats.departments} />
          <StatTile label="Programs" value={institution.stats.programs} />
          <StatTile label="Placement" value={`${institution.stats.placementRate}%`} />
          <StatTile label="Highest CTC" value={`${institution.stats.highestPackageLpa}L`} />
        </dl>
      </div>
    </header>
  );
}

function OverviewSection({ institution }: { institution: InstitutionProfile }) {
  return (
    <DiscoverySection id="overview" title="About the institution" description={institution.overview}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mission</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{institution.mission}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vision</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{institution.vision}</CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{institution.history}</CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="mt-0 flex flex-col gap-4 pt-6 sm:flex-row sm:items-start">
              <LogoBadge initials={institution.leader.initials} size="md" />
              <div>
                <p className="text-sm leading-relaxed italic">“{institution.leader.message}”</p>
                <p className="mt-3 text-sm font-semibold">{institution.leader.name}</p>
                <p className="text-muted-foreground text-xs">{institution.leader.title}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Institution information</CardTitle>
            <CardDescription>Key facts & contact</CardDescription>
          </CardHeader>
          <CardContent className="divide-border divide-y">
            <InfoRow icon={Building2} label="Type" value={institution.type} />
            <InfoRow icon={Calendar} label="Established" value={institution.established} />
            <InfoRow icon={ScrollText} label="Affiliation" value={institution.affiliation} />
            <InfoRow icon={BadgeCheck} label="Accreditation" value={institution.accreditation.join(", ")} />
            <InfoRow icon={CheckCircle2} label="Approvals" value={institution.approvals.join(", ")} />
            <InfoRow icon={Ruler} label="Campus area" value={`${institution.campusAreaAcres} acres`} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={`${institution.location.address}, ${institution.location.city}, ${institution.location.state} ${institution.location.pincode}`}
            />
            <InfoRow
              icon={Globe}
              label="Website"
              value={
                <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {institution.website.replace(/^https?:\/\//, "")}
                </a>
              }
            />
            <InfoRow icon={Mail} label="Email" value={institution.email} />
            <InfoRow icon={Phone} label="Phone" value={institution.phone} />
            <div className="flex items-center gap-2 pt-3">
              {institution.social.linkedin ? (
                <a href={institution.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="bg-muted hover:bg-muted/70 flex size-9 items-center justify-center rounded-lg">
                  <Link2 className="size-4" aria-hidden="true" />
                </a>
              ) : null}
              {institution.social.instagram ? (
                <a href={institution.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="bg-muted hover:bg-muted/70 flex size-9 items-center justify-center rounded-lg">
                  <Link2 className="size-4" aria-hidden="true" />
                </a>
              ) : null}
              {institution.social.youtube ? (
                <a href={institution.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="bg-muted hover:bg-muted/70 flex size-9 items-center justify-center rounded-lg">
                  <Link2 className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </DiscoverySection>
  );
}

function ProgramsSection({ institution }: { institution: InstitutionProfile }) {
  return (
    <DiscoverySection
      id="programs"
      title="Academic programs"
      description="Departments, programs, specializations, eligibility and duration."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {institution.departments.map((department) => (
          <Badge key={department} variant="muted" className="text-sm">
            {department}
          </Badge>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {institution.programs.map((program) => (
          <Card key={program.id} interactive>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{program.level}</Badge>
                <span className="text-muted-foreground text-xs">{program.duration}</span>
              </div>
              <CardTitle className="mt-2 text-base">{program.name}</CardTitle>
              <CardDescription>{program.department}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Specializations</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {program.specializations.map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-[11px]">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Eligibility</p>
                <p className="text-sm">{program.eligibility}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DiscoverySection>
  );
}

function PlacementsSection({ institution }: { institution: InstitutionProfile }) {
  return (
    <DiscoverySection
      id="placements"
      title="Placement showcase"
      description="Recruitment outcomes, top recruiters and alumni success stories."
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Placement rate" value={`${institution.stats.placementRate}%`} />
        <StatTile label="Highest package" value={`${institution.stats.highestPackageLpa} LPA`} />
        <StatTile label="Average package" value={`${institution.stats.avgPackageLpa} LPA`} />
        <StatTile label="Internships" value={institution.stats.internships} />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top recruiters</CardTitle>
            <CardDescription>Companies hiring from campus</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {institution.recruiters.map((recruiter) => (
              <span
                key={recruiter}
                className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
              >
                <Briefcase className="text-muted-foreground size-4" aria-hidden="true" />
                {recruiter}
              </span>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Placement partners</CardTitle>
            <CardDescription>Strategic hiring alliances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {institution.placementPartners.map((partner) => (
              <div key={partner} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                {partner}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {institution.successStories.map((story) => (
          <Card key={story.id} className="bg-muted/20">
            <CardContent className="mt-0 flex flex-col gap-3 pt-6">
              <div className="flex items-center gap-3">
                <LogoBadge initials={story.initials} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{story.name}</p>
                  <p className="text-muted-foreground text-xs">{story.company}</p>
                </div>
                <Badge variant="default" className="ml-auto">
                  {story.packageLpa} LPA
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm italic">“{story.quote}”</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DiscoverySection>
  );
}

function FacultySection({ institution }: { institution: InstitutionProfile }) {
  return (
    <DiscoverySection
      id="faculty"
      title="Faculty showcase"
      description="Distinguished faculty leading teaching and research."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {institution.featuredFaculty.map((faculty) => (
          <Card key={faculty.id} interactive>
            <CardContent className="mt-0 space-y-3 pt-6">
              <div className="flex items-center gap-3">
                <LogoBadge initials={faculty.initials} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{faculty.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{faculty.title}</p>
                </div>
              </div>
              <div className="text-muted-foreground space-y-1 text-xs">
                <p className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" aria-hidden="true" />
                  {faculty.qualification}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden="true" />
                  {faculty.department}
                </p>
                <p className="flex items-center gap-1.5">
                  <FlaskConical className="size-3.5" aria-hidden="true" />
                  {faculty.research}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {faculty.awards.map((award) => (
                  <Badge key={award} variant="secondary" className="text-[11px]">
                    <Award className="mr-1 size-3" aria-hidden="true" />
                    {award}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DiscoverySection>
  );
}

function CampusSection({
  institution,
  gallery,
  galleryFilter,
  onGalleryFilter,
}: {
  institution: InstitutionProfile;
  gallery: DiscoveryGalleryItem[];
  galleryFilter: DiscoveryGalleryItem["category"] | "all";
  onGalleryFilter: (value: DiscoveryGalleryItem["category"] | "all") => void;
}) {
  return (
    <DiscoverySection
      id="campus"
      title="Campus life"
      description="Infrastructure, laboratories, library, sports, hostels and events."
    >
      <div
        role="tablist"
        aria-label="Gallery categories"
        className="mb-5 flex flex-wrap gap-1.5"
      >
        {GALLERY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={galleryFilter === filter.value}
            onClick={() => onGalleryFilter(filter.value)}
            className={cn(
              "focus-visible:ring-ring rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
              galleryFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((item) => (
          <figure
            key={item.id}
            className="group border-border relative aspect-video overflow-hidden rounded-xl border"
          >
            <div className="from-primary/25 via-primary/10 to-muted absolute inset-0 bg-gradient-to-br" aria-hidden="true" />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3 text-white">
              <span className="text-sm font-medium">{item.title}</span>
              <Badge variant="outline" className="border-white/40 bg-black/30 capitalize text-white">
                {item.category}
              </Badge>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {institution.infrastructure.map((item) => (
          <Card key={item.name}>
            <CardHeader>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </DiscoverySection>
  );
}

function AchievementsSection({ institution }: { institution: InstitutionProfile }) {
  return (
    <DiscoverySection
      id="achievements"
      title="Achievements"
      description="Awards, research, patents, rankings, competitions and sports."
    >
      <ol className="border-border relative space-y-6 border-l pl-6">
        {institution.achievements.map((achievement) => (
          <li key={achievement.id} className="relative">
            <span className="bg-primary absolute top-1 -left-[1.6rem] flex size-6 items-center justify-center rounded-full text-primary-foreground" aria-hidden="true">
              <Trophy className="size-3" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{achievement.title}</h3>
              <Badge variant="muted" className="capitalize">
                {achievement.category}
              </Badge>
              <span className="text-muted-foreground text-xs">{achievement.year}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{achievement.detail}</p>
          </li>
        ))}
      </ol>
    </DiscoverySection>
  );
}

function ReviewsSection({
  institution,
  reviews,
  reviewFilter,
  onReviewFilter,
}: {
  institution: InstitutionProfile;
  reviews: InstitutionProfile["reviews"];
  reviewFilter: ReviewAudience | "all";
  onReviewFilter: (value: ReviewAudience | "all") => void;
}) {
  const breakdown = institution.ratingsBreakdown;
  const rows: Array<{ label: string; value: number }> = [
    { label: "Teaching", value: breakdown.teaching },
    { label: "Placement", value: breakdown.placement },
    { label: "Campus", value: breakdown.campus },
    { label: "Faculty", value: breakdown.faculty },
    { label: "Value for money", value: breakdown.value },
  ];
  return (
    <DiscoverySection
      id="reviews"
      title="Reviews & ratings"
      description="Verified feedback from students, alumni and recruiting companies."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit text-center">
          <CardContent className="mt-0 pt-6">
            <p className="text-5xl font-semibold tabular-nums">{institution.rating.toFixed(1)}</p>
            <div className="mt-2 flex justify-center">
              <RatingStars value={institution.rating} />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Based on {institution.reviewCount.toLocaleString()} reviews
            </p>
            <div className="mt-5 space-y-3 text-left">
              {rows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{row.value.toFixed(1)}</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${(row.value / 5) * 100}%` }}
                      role="progressbar"
                      aria-label={row.label}
                      aria-valuenow={Math.round((row.value / 5) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div role="tablist" aria-label="Review audience" className="flex flex-wrap gap-1.5">
            {REVIEW_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={reviewFilter === filter.value}
                onClick={() => onReviewFilter(filter.value)}
                className={cn(
                  "focus-visible:ring-ring rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
                  reviewFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="mt-0 space-y-2 pt-6">
                <div className="flex items-center gap-3">
                  <LogoBadge initials={review.initials} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{review.author}</p>
                    <p className="text-muted-foreground text-xs capitalize">{review.audience}</p>
                  </div>
                  <RatingStars value={review.rating} />
                </div>
                <p className="text-sm font-medium">{review.title}</p>
                <p className="text-muted-foreground text-sm">{review.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DiscoverySection>
  );
}

function AdmissionSection({ institution }: { institution: InstitutionProfile }) {
  const admission = institution.admission;
  return (
    <DiscoverySection
      id="admission"
      title="Admissions"
      description="Process, eligibility, documents, fees, scholarships and key dates."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admission process</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {admission.process.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eligibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {admission.eligibility.map((item) => (
                  <div key={item} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Required documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {admission.documents.map((item) => (
                  <div key={item} className="flex gap-2 text-sm">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scholarships</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {admission.scholarships.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee structure</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              {admission.fees.map((fee) => (
                <div key={fee.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{fee.label}</span>
                  <span className="font-semibold">{fee.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Important dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {admission.importantDates.map((entry) => (
                <div key={entry.label} className="flex items-center gap-3 text-sm">
                  <Calendar className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{entry.label}</span>
                  <span className="text-muted-foreground tabular-nums">{entry.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <a
            href={admission.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Apply now
            <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </div>
    </DiscoverySection>
  );
}
