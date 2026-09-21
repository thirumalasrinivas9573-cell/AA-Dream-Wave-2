"use client";

import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Coins,
  Percent,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import type { AcademicColumn } from "@/components/institution/academics/academic-table";
import { AcademicTable } from "@/components/institution/academics/academic-table";
import { exportCsv } from "@/components/institution/academics/academic-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { CompanyProfileDrawer } from "@/components/institution/placements/company-profile-drawer";
import {
  ApplicationStageDialog,
  DriveDialog,
  InternshipDialog,
  InterviewDialog,
  JobDialog,
  OfferDialog,
  PlacementNotificationDialog,
  RecruiterDialog,
} from "@/components/institution/placements/placement-dialogs";
import {
  APPLICATION_STAGE_OPTIONS,
  ApplicationStageBadge,
  formatCurrency,
  formatStipend,
  InterviewStatusBadge,
  LISTING_STATUS_OPTIONS,
  ListingStatusBadge,
  OfferStatusBadge,
  PLACEMENT_STATUS_OPTIONS,
  PlacementStatusBadge,
} from "@/components/institution/placements/placement-ui";
import {
  EntityFilterSelect,
  EntityPagination,
  EntityPanel,
  usePagination,
} from "@/components/institution/shared/entity-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { usePlacementManagementStore } from "@/store/placement-management-store";
import type {
  Internship,
  Interview,
  Job,
  Offer,
  PlacementApplication,
  PlacementDrive,
  Recruiter,
} from "@/types/placement-management";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "recruiters", label: "Recruiters" },
  { id: "drives", label: "Drives" },
  { id: "internships", label: "Internships" },
  { id: "jobs", label: "Jobs" },
  { id: "applications", label: "Applications" },
  { id: "interviews", label: "Interviews" },
  { id: "offers", label: "Offers" },
  { id: "eligibility", label: "Eligibility" },
] as const;

type PlacementTab = (typeof TABS)[number]["id"];

type DialogState =
  | { kind: "recruiter"; record: Recruiter | null }
  | { kind: "drive"; record: PlacementDrive | null }
  | { kind: "internship"; record: Internship | null }
  | { kind: "job"; record: Job | null }
  | { kind: "interview"; record: Interview | null }
  | { kind: "offer"; record: Offer | null }
  | null;

export function PlacementManagementPage({
  initialTab = "overview",
}: {
  initialTab?: PlacementTab;
}) {
  const { token } = useAuth();
  const store = usePlacementManagementStore();
  const {
    hydrated,
    hydrate,
    apiEnabled,
    loading,
    error,
    stats,
    eligibility,
    fetchWorkspace,
    fetchEligibility,
    transitionDrive,
    generateShortlist,
    sendNotification,
    recruiters,
    drives,
    internships,
    jobs,
    applications,
    interviews,
    offers,
  } = store;

  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  const [tab, setTab] = useState<PlacementTab>(initialTab);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [recruiterFilter, setRecruiterFilter] = useState({ industry: "", driveStatus: "" });
  const [driveFilter, setDriveFilter] = useState({ companyId: "", status: "" });
  const [internshipFilter, setInternshipFilter] = useState({ companyId: "", workMode: "", status: "" });
  const [jobFilter, setJobFilter] = useState({ companyId: "", jobType: "", status: "" });
  const [appFilter, setAppFilter] = useState({ department: "", stage: "", graduationYear: "" });
  const [offerFilter, setOfferFilter] = useState({ status: "", department: "" });

  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [stageApp, setStageApp] = useState<PlacementApplication | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: PlacementTab; id: string; label: string } | null
  >(null);

  const [eligDriveId, setEligDriveId] = useState<string>("");

  const activeDriveId = eligDriveId || drives[0]?.id || "";

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!useLiveApi || !token) return;
    void fetchWorkspace(token);
  }, [useLiveApi, token, fetchWorkspace]);

  useEffect(() => {
    if (!useLiveApi || !token || tab !== "eligibility" || !activeDriveId) return;
    void fetchEligibility(token, activeDriveId);
  }, [useLiveApi, token, tab, activeDriveId, fetchEligibility]);

  const companyName = useCallback(
    (id: string) => recruiters.find((r) => r.id === id)?.name ?? "—",
    [recruiters],
  );

  const handleSort = useCallback((key: string) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  const changeTab = useCallback((next: PlacementTab) => {
    setTab(next);
    setQuery("");
    setSortKey("name");
    setSortDirection("asc");
  }, []);

  const compare = useCallback(
    (a: unknown, b: unknown) => {
      const result =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b), undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    },
    [sortDirection],
  );

  const term = query.trim().toLowerCase();

  const placedStudents = useMemo(
    () =>
      new Set(
        applications
          .filter((a) => a.stage === "selected" || a.stage === "offer-accepted")
          .map((a) => a.studentName),
      ).size,
    [applications],
  );
  const eligibleStudents = useMemo(
    () => new Set(applications.map((a) => a.studentName)).size,
    [applications],
  );
  const highestPackage = useMemo(
    () => offers.reduce((max, o) => Math.max(max, o.salary), 0),
    [offers],
  );
  const averagePackage = useMemo(
    () => (offers.length ? Math.round(offers.reduce((sum, o) => sum + o.salary, 0) / offers.length) : 0),
    [offers],
  );

  const metrics = useMemo(() => {
    if (apiEnabled && stats) {
      return [
        { label: "Companies Registered", value: stats.companies, hint: "Active partnerships", icon: Building2 },
        { label: "Placement Drives", value: stats.drives, hint: "All drives", icon: CalendarDays },
        { label: "Applications", value: stats.applications, hint: "Submitted", icon: Users },
        { label: "Students Placed", value: stats.placed, hint: "Hired / accepted", icon: BadgeCheck },
        { label: "Internships", value: stats.internships, hint: "Listings", icon: Briefcase },
        { label: "Offers Released", value: stats.offers, hint: "All offers", icon: Award },
        { label: "Interviews", value: stats.interviews, hint: "Scheduled", icon: CalendarClock },
        { label: "Jobs", value: stats.jobs, hint: "Open listings", icon: Briefcase },
        { label: "Active Partnerships", value: stats.activePartnerships, hint: "Company links", icon: Building2 },
        { label: "Upcoming Drives", value: drives.filter((d) => d.status === "upcoming").length, hint: "Scheduled ahead", icon: CalendarClock },
      ] as const;
    }
    return [
        { label: "Companies Registered", value: recruiters.length, hint: "Active recruiters", icon: Building2 },
        { label: "Placement Drives", value: drives.length, hint: "All drives", icon: CalendarDays },
        { label: "Students Eligible", value: eligibleStudents, hint: "In pipeline", icon: Users },
        { label: "Students Placed", value: placedStudents, hint: "Selected / accepted", icon: BadgeCheck },
        { label: "Internships", value: internships.length, hint: "Listings", icon: Briefcase },
        { label: "Offers Released", value: offers.length, hint: "All offers", icon: Award },
        { label: "Highest Package", value: highestPackage ? formatCurrency(highestPackage) : "—", hint: "Top offer", icon: TrendingUp },
        { label: "Average Package", value: averagePackage ? formatCurrency(averagePackage) : "—", hint: "Mean offer", icon: Coins },
        { label: "Placement %", value: `${eligibleStudents ? Math.round((placedStudents / eligibleStudents) * 100) : 0}%`, hint: "Placed of eligible", icon: Percent },
        { label: "Upcoming Drives", value: drives.filter((d) => d.status === "upcoming").length, hint: "Scheduled ahead", icon: CalendarClock },
      ] as const;
  }, [averagePackage, apiEnabled, drives, eligibleStudents, highestPackage, internships.length, offers.length, placedStudents, recruiters.length, stats]);

  const filteredRecruiters = useMemo(
    () =>
      recruiters
        .filter(
          (r) =>
            (!term || [r.name, r.industry, r.hrContact, r.location].join(" ").toLowerCase().includes(term)) &&
            (!recruiterFilter.industry || r.industry === recruiterFilter.industry) &&
            (!recruiterFilter.driveStatus || r.driveStatus === recruiterFilter.driveStatus),
        )
        .toSorted((a, b) => compare(a[sortKey as keyof Recruiter], b[sortKey as keyof Recruiter])),
    [recruiters, term, recruiterFilter, compare, sortKey],
  );

  const filteredDrives = useMemo(
    () =>
      drives
        .filter(
          (d) =>
            (!term || [d.name, companyName(d.companyId), d.venue].join(" ").toLowerCase().includes(term)) &&
            (!driveFilter.companyId || d.companyId === driveFilter.companyId) &&
            (!driveFilter.status || d.status === driveFilter.status),
        )
        .toSorted((a, b) => compare(a[sortKey as keyof PlacementDrive], b[sortKey as keyof PlacementDrive])),
    [drives, term, driveFilter, compare, sortKey, companyName],
  );

  const filteredInternships = useMemo(
    () =>
      internships
        .filter(
          (i) =>
            (!term || [i.title, companyName(i.companyId), i.location].join(" ").toLowerCase().includes(term)) &&
            (!internshipFilter.companyId || i.companyId === internshipFilter.companyId) &&
            (!internshipFilter.workMode || i.workMode === internshipFilter.workMode) &&
            (!internshipFilter.status || i.status === internshipFilter.status),
        )
        .toSorted((a, b) => compare(a[sortKey as keyof Internship], b[sortKey as keyof Internship])),
    [internships, term, internshipFilter, compare, sortKey, companyName],
  );

  const filteredJobs = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            (!term || [j.title, companyName(j.companyId), j.location].join(" ").toLowerCase().includes(term)) &&
            (!jobFilter.companyId || j.companyId === jobFilter.companyId) &&
            (!jobFilter.jobType || j.jobType === jobFilter.jobType) &&
            (!jobFilter.status || j.status === jobFilter.status),
        )
        .toSorted((a, b) => compare(a[sortKey as keyof Job], b[sortKey as keyof Job])),
    [jobs, term, jobFilter, compare, sortKey, companyName],
  );

  const filteredApplications = useMemo(
    () =>
      applications
        .filter(
          (a) =>
            (!term || [a.studentName, companyName(a.companyId), a.role].join(" ").toLowerCase().includes(term)) &&
            (!appFilter.department || a.department === appFilter.department) &&
            (!appFilter.stage || a.stage === appFilter.stage) &&
            (!appFilter.graduationYear || a.graduationYear === appFilter.graduationYear),
        )
        .toSorted((a, b) => compare(a[sortKey === "name" ? "studentName" : (sortKey as keyof PlacementApplication)], b[sortKey === "name" ? "studentName" : (sortKey as keyof PlacementApplication)])),
    [applications, term, appFilter, compare, sortKey, companyName],
  );

  const filteredInterviews = useMemo(
    () =>
      interviews
        .filter((i) => !term || [i.studentName, companyName(i.companyId), i.role, i.panel].join(" ").toLowerCase().includes(term))
        .toSorted((a, b) => compare(a[sortKey === "name" ? "studentName" : (sortKey as keyof Interview)], b[sortKey === "name" ? "studentName" : (sortKey as keyof Interview)])),
    [interviews, term, compare, sortKey, companyName],
  );

  const filteredOffers = useMemo(
    () =>
      offers
        .filter(
          (o) =>
            (!term || [o.studentName, companyName(o.companyId), o.role].join(" ").toLowerCase().includes(term)) &&
            (!offerFilter.status || o.status === offerFilter.status) &&
            (!offerFilter.department || o.department === offerFilter.department),
        )
        .toSorted((a, b) => compare(a[sortKey === "name" ? "studentName" : (sortKey as keyof Offer)], b[sortKey === "name" ? "studentName" : (sortKey as keyof Offer)])),
    [offers, term, offerFilter, compare, sortKey, companyName],
  );

  const recruiterPagination = usePagination(filteredRecruiters);
  const drivePagination = usePagination(filteredDrives);
  const internshipPagination = usePagination(filteredInternships);
  const jobPagination = usePagination(filteredJobs);
  const appPagination = usePagination(filteredApplications);
  const interviewPagination = usePagination(filteredInterviews);
  const offerPagination = usePagination(filteredOffers);

  const industries = useMemo(() => [...new Set(recruiters.map((r) => r.industry))].sort(), [recruiters]);
  const departments = useMemo(() => [...new Set(applications.map((a) => a.department))].sort(), [applications]);
  const gradYears = useMemo(() => [...new Set(applications.map((a) => a.graduationYear))].sort(), [applications]);
  const offerDepartments = useMemo(() => [...new Set(offers.map((o) => o.department))].sort(), [offers]);
  const recruiterOptions = useMemo(() => recruiters.map((r) => ({ value: r.id, label: r.name })), [recruiters]);

  const eligibleForDrive = useMemo(() => {
    if (apiEnabled && eligibility.length) {
      return eligibility.map((row) => ({
        id: row.studentId,
        studentName: row.studentName || row.fullName || "—",
        department: row.department || "",
        cgpa: row.cgpa ?? 0,
        graduationYear: "",
        role: "",
        status: row.status,
        eligible: row.eligible,
        reasons: row.reasons,
      }));
    }
    const drive = drives.find((d) => d.id === activeDriveId);
    if (!drive) return [];
    return applications.filter(
      (a) =>
        a.cgpa >= drive.minCgpa &&
        (drive.eligibleDepartments.length === 0 || drive.eligibleDepartments.includes(a.department)),
    ).map((a) => ({ ...a, status: "eligible", eligible: true, reasons: [] as string[] }));
  }, [apiEnabled, eligibility, applications, drives, activeDriveId]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    if (kind === "recruiters") store.removeRecruiter(id);
    if (kind === "drives") store.removeDrive(id);
    if (kind === "internships") store.removeInternship(id);
    if (kind === "jobs") store.removeJob(id);
    if (kind === "applications") store.removeApplication(id);
    if (kind === "interviews") store.removeInterview(id);
    if (kind === "offers") store.removeOffer(id);
  };

  const importNotice = () =>
    window.alert(
      "Import students / companies (CSV / Excel / bulk upload) is wired to the institution data pipeline. Connect a file to ingest records.",
    );

  const selectedRecruiter = recruiters.find((r) => r.id === selectedRecruiterId) ?? null;

  const recruiterColumns: Array<AcademicColumn<Recruiter>> = [
    {
      key: "name",
      header: "Company",
      sortable: true,
      cell: (row) => (
        <button type="button" onClick={() => setSelectedRecruiterId(row.id)} className="flex items-center gap-3 text-left">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl text-xs font-semibold">{row.logoInitials}</span>
          <span>
            <span className="text-primary block font-medium hover:underline">{row.name}</span>
            <span className="text-muted-foreground block text-xs">{row.industry}</span>
          </span>
        </button>
      ),
    },
    { key: "hrContact", header: "HR Contact", sortable: true, cell: (row) => row.hrContact },
    { key: "email", header: "Email", cell: (row) => <a href={`mailto:${row.email}`} className="hover:underline">{row.email}</a> },
    { key: "location", header: "Location", sortable: true, cell: (row) => row.location },
    { key: "internshipsCount", header: "Internships", sortable: true, cell: (row) => internships.filter((i) => i.companyId === row.id).length },
    { key: "jobsCount", header: "Jobs", sortable: true, cell: (row) => jobs.filter((j) => j.companyId === row.id).length },
    { key: "driveStatus", header: "Drive Status", sortable: true, cell: (row) => <PlacementStatusBadge status={row.driveStatus} /> },
  ];

  const driveColumns: Array<AcademicColumn<PlacementDrive>> = [
    { key: "name", header: "Drive", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "date", header: "Date", sortable: true, cell: (row) => row.date },
    { key: "mode", header: "Mode", cell: (row) => <Badge variant="outline" className="capitalize">{row.mode}</Badge> },
    { key: "minCgpa", header: "Min CGPA", sortable: true, cell: (row) => row.minCgpa },
    { key: "registrationDeadline", header: "Reg. Deadline", sortable: true, cell: (row) => row.registrationDeadline },
    { key: "status", header: "Status", sortable: true, cell: (row) => <PlacementStatusBadge status={row.status} /> },
    ...(apiEnabled
      ? [{
          key: "actions",
          header: "Actions",
          cell: (row: PlacementDrive) => (
            <div className="flex flex-wrap gap-1">
              {["draft", "published"].includes(row.status) ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void transitionDrive(row.id, "publish", token ?? undefined)}>Publish</Button>
              ) : null}
              {row.status === "registration_open" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void transitionDrive(row.id, "close_registration", token ?? undefined)}>Close reg.</Button>
              ) : null}
              {!["cancelled", "archived", "completed"].includes(row.status) ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void generateShortlist(row.id, token ?? undefined)}>Shortlist</Button>
              ) : null}
              {["completed", "closed"].includes(row.status) ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void transitionDrive(row.id, "archive", token ?? undefined)}>Archive</Button>
              ) : null}
            </div>
          ),
        }]
      : []),
  ];

  const internshipColumns: Array<AcademicColumn<Internship>> = [
    { key: "title", header: "Internship", sortable: true, cell: (row) => <span className="font-medium">{row.title}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "duration", header: "Duration", sortable: true, cell: (row) => row.duration },
    { key: "workMode", header: "Mode", cell: (row) => <Badge variant="outline" className="capitalize">{row.workMode}</Badge> },
    { key: "stipend", header: "Stipend", sortable: true, cell: (row) => formatStipend(row.stipend) },
    { key: "openPositions", header: "Positions", sortable: true, cell: (row) => row.openPositions },
    { key: "status", header: "Status", sortable: true, cell: (row) => <ListingStatusBadge status={row.status} /> },
  ];

  const jobColumns: Array<AcademicColumn<Job>> = [
    { key: "title", header: "Job", sortable: true, cell: (row) => <span className="font-medium">{row.title}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "salary", header: "Salary", sortable: true, cell: (row) => formatCurrency(row.salary) },
    { key: "location", header: "Location", sortable: true, cell: (row) => row.location },
    { key: "jobType", header: "Type", cell: (row) => <Badge variant="outline" className="capitalize">{row.jobType.replace("-", " ")}</Badge> },
    { key: "deadline", header: "Deadline", sortable: true, cell: (row) => row.deadline },
    { key: "status", header: "Status", sortable: true, cell: (row) => <ListingStatusBadge status={row.status} /> },
  ];

  const applicationColumns: Array<AcademicColumn<PlacementApplication>> = [
    { key: "name", header: "Student", sortable: true, cell: (row) => <span className="font-medium">{row.studentName}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "role", header: "Role", sortable: true, cell: (row) => row.role },
    { key: "department", header: "Department", sortable: true, cell: (row) => row.department },
    { key: "cgpa", header: "CGPA", sortable: true, cell: (row) => row.cgpa },
    { key: "stage", header: "Stage", sortable: true, cell: (row) => <ApplicationStageBadge stage={row.stage} /> },
  ];

  const interviewColumns: Array<AcademicColumn<Interview>> = [
    { key: "name", header: "Student", sortable: true, cell: (row) => <span className="font-medium">{row.studentName}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "role", header: "Role", cell: (row) => row.role },
    { key: "date", header: "Date", sortable: true, cell: (row) => `${row.date} ${row.time}` },
    { key: "panel", header: "Panel", cell: (row) => row.panel },
    { key: "mode", header: "Mode", cell: (row) => (row.meetingLink ? <a href={row.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Online</a> : row.venue || "—") },
    { key: "status", header: "Status", sortable: true, cell: (row) => <InterviewStatusBadge status={row.status} /> },
  ];

  const offerColumns: Array<AcademicColumn<Offer>> = [
    { key: "name", header: "Student", sortable: true, cell: (row) => <span className="font-medium">{row.studentName}</span> },
    { key: "companyId", header: "Company", cell: (row) => companyName(row.companyId) },
    { key: "role", header: "Role", cell: (row) => row.role },
    { key: "salary", header: "Package", sortable: true, cell: (row) => formatCurrency(row.salary) },
    { key: "joiningDate", header: "Joining", sortable: true, cell: (row) => row.joiningDate },
    { key: "status", header: "Status", sortable: true, cell: (row) => <OfferStatusBadge status={row.status} /> },
  ];

  const stageCounts = useMemo(
    () =>
      APPLICATION_STAGE_OPTIONS.map((option) => ({
        ...option,
        count: applications.filter((a) => a.stage === option.value).length,
      })),
    [applications],
  );

  if (!hydrated) return <RouteLoading label="Loading placement management" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution ERP"
        title="Placement, Internship & Recruiter Management"
        description="Manage recruiters, campus drives, internships, jobs, applications, interviews, and offers — the bridge between institution, students, and companies."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={() => setNotifyOpen(true)}>
              <Send aria-hidden="true" />
              Notify
            </Button>
            <Button type="button" className="h-10" onClick={() => setDialog({ kind: "recruiter", record: null })}>
              <Building2 aria-hidden="true" />
              Add Recruiter
            </Button>
          </div>
        }
      />

      <nav aria-label="Placement sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Management</span>
        <Link href={INSTITUTION_ROUTES.placementsAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>
        <Link href={INSTITUTION_ROUTES.placementsReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>Reports</Link>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {loading && apiEnabled ? <RouteLoading label="Loading placement data" /> : null}

      <section aria-labelledby="placement-metrics-heading">
        <h2 id="placement-metrics-heading" className="sr-only">Placement metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div role="tablist" aria-label="Placement modules" className="flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={buttonVariants({ variant: tab === item.id ? "default" : "ghost", size: "sm" })}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Upcoming & ongoing drives</CardTitle>
              <CardDescription>Scheduled recruitment activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drives.filter((d) => d.status !== "completed" && d.status !== "cancelled").map((drive) => (
                <div key={drive.id} className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">{drive.name}</p>
                    <p className="text-muted-foreground text-xs">{companyName(drive.companyId)} · {drive.date} · {drive.venue}</p>
                  </div>
                  <PlacementStatusBadge status={drive.status} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Application pipeline</CardTitle>
              <CardDescription>Live recruitment stage distribution.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {stageCounts.map((stage) => (
                  <div key={stage.value} className="border-border bg-muted/20 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <span className="text-sm">{stage.label}</span>
                    <span className="font-semibold">{stage.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "recruiters" ? (
        <EntityPanel
          title="Recruiter directory"
          description="Registered companies, HR contacts, and campus drive status."
          count={filteredRecruiters.length}
          addLabel="Add recruiter"
          onAdd={() => setDialog({ kind: "recruiter", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "recruiters.csv",
              ["Company", "Industry", "HR", "Email", "Phone", "Location", "Drive Status"],
              filteredRecruiters.map((r) => [r.name, r.industry, r.hrContact, r.email, r.phone, r.location, r.driveStatus]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search companies by name, industry, HR, or location…"
          onClearFilters={() => setRecruiterFilter({ industry: "", driveStatus: "" })}
          filters={
            <>
              <EntityFilterSelect label="Industry" value={recruiterFilter.industry} options={industries.map((i) => ({ value: i, label: i }))} onChange={(value) => setRecruiterFilter((f) => ({ ...f, industry: value }))} />
              <EntityFilterSelect label="Drive Status" value={recruiterFilter.driveStatus} options={PLACEMENT_STATUS_OPTIONS} onChange={(value) => setRecruiterFilter((f) => ({ ...f, driveStatus: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={recruiterPagination.visible}
            columns={recruiterColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "recruiter", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "recruiters", id: row.id, label: row.name })}
            minWidth="min-w-[1100px]"
          />
          <EntityPagination page={recruiterPagination.page} pageCount={recruiterPagination.pageCount} total={filteredRecruiters.length} onPage={recruiterPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "drives" ? (
        <EntityPanel
          title="Placement drives"
          description="Campus recruitment drives with eligibility and schedules."
          count={filteredDrives.length}
          addLabel="Add drive"
          onAdd={() => setDialog({ kind: "drive", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "drives.csv",
              ["Drive", "Company", "Date", "Mode", "Venue", "Min CGPA", "Reg. Deadline", "Status"],
              filteredDrives.map((d) => [d.name, companyName(d.companyId), d.date, d.mode, d.venue, d.minCgpa, d.registrationDeadline, d.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search drives by name, company, or venue…"
          onClearFilters={() => setDriveFilter({ companyId: "", status: "" })}
          filters={
            <>
              <EntityFilterSelect label="Company" value={driveFilter.companyId} options={recruiterOptions} onChange={(value) => setDriveFilter((f) => ({ ...f, companyId: value }))} />
              <EntityFilterSelect label="Status" value={driveFilter.status} options={PLACEMENT_STATUS_OPTIONS} onChange={(value) => setDriveFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={drivePagination.visible}
            columns={driveColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "drive", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "drives", id: row.id, label: row.name })}
            minWidth="min-w-[1000px]"
          />
          <EntityPagination page={drivePagination.page} pageCount={drivePagination.pageCount} total={filteredDrives.length} onPage={drivePagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "internships" ? (
        <EntityPanel
          title="Internship management"
          description="Internship listings, stipends, and eligibility."
          count={filteredInternships.length}
          addLabel="Add internship"
          onAdd={() => setDialog({ kind: "internship", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "internships.csv",
              ["Title", "Company", "Duration", "Mode", "Location", "Stipend", "Positions", "Status"],
              filteredInternships.map((i) => [i.title, companyName(i.companyId), i.duration, i.workMode, i.location, i.stipend, i.openPositions, i.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search internships by title, company, or location…"
          onClearFilters={() => setInternshipFilter({ companyId: "", workMode: "", status: "" })}
          filters={
            <>
              <EntityFilterSelect label="Company" value={internshipFilter.companyId} options={recruiterOptions} onChange={(value) => setInternshipFilter((f) => ({ ...f, companyId: value }))} />
              <EntityFilterSelect label="Work Mode" value={internshipFilter.workMode} options={[{ value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }, { value: "office", label: "Office" }]} onChange={(value) => setInternshipFilter((f) => ({ ...f, workMode: value }))} />
              <EntityFilterSelect label="Status" value={internshipFilter.status} options={LISTING_STATUS_OPTIONS} onChange={(value) => setInternshipFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={internshipPagination.visible}
            columns={internshipColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "internship", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "internships", id: row.id, label: row.title })}
            minWidth="min-w-[1000px]"
          />
          <EntityPagination page={internshipPagination.page} pageCount={internshipPagination.pageCount} total={filteredInternships.length} onPage={internshipPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "jobs" ? (
        <EntityPanel
          title="Job management"
          description="Full-time and contract job opportunities."
          count={filteredJobs.length}
          addLabel="Add job"
          onAdd={() => setDialog({ kind: "job", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "jobs.csv",
              ["Title", "Company", "Salary", "Location", "Type", "Experience", "Deadline", "Status"],
              filteredJobs.map((j) => [j.title, companyName(j.companyId), j.salary, j.location, j.jobType, j.experience, j.deadline, j.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search jobs by title, company, or location…"
          onClearFilters={() => setJobFilter({ companyId: "", jobType: "", status: "" })}
          filters={
            <>
              <EntityFilterSelect label="Company" value={jobFilter.companyId} options={recruiterOptions} onChange={(value) => setJobFilter((f) => ({ ...f, companyId: value }))} />
              <EntityFilterSelect label="Job Type" value={jobFilter.jobType} options={[{ value: "full-time", label: "Full Time" }, { value: "part-time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }]} onChange={(value) => setJobFilter((f) => ({ ...f, jobType: value }))} />
              <EntityFilterSelect label="Status" value={jobFilter.status} options={LISTING_STATUS_OPTIONS} onChange={(value) => setJobFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={jobPagination.visible}
            columns={jobColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "job", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "jobs", id: row.id, label: row.title })}
            minWidth="min-w-[1000px]"
          />
          <EntityPagination page={jobPagination.page} pageCount={jobPagination.pageCount} total={filteredJobs.length} onPage={jobPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "applications" ? (
        <EntityPanel
          title="Application tracking"
          description="Track candidates across the recruitment pipeline."
          count={filteredApplications.length}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "applications.csv",
              ["Student", "Company", "Role", "Type", "Department", "CGPA", "Graduation", "Stage"],
              filteredApplications.map((a) => [a.studentName, companyName(a.companyId), a.role, a.type, a.department, a.cgpa, a.graduationYear, a.stage]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search applications by student, company, or role…"
          onClearFilters={() => setAppFilter({ department: "", stage: "", graduationYear: "" })}
          filters={
            <>
              <EntityFilterSelect label="Department" value={appFilter.department} options={departments.map((d) => ({ value: d, label: d }))} onChange={(value) => setAppFilter((f) => ({ ...f, department: value }))} />
              <EntityFilterSelect label="Stage" value={appFilter.stage} options={APPLICATION_STAGE_OPTIONS} onChange={(value) => setAppFilter((f) => ({ ...f, stage: value }))} />
              <EntityFilterSelect label="Graduation Year" value={appFilter.graduationYear} options={gradYears.map((y) => ({ value: y, label: y }))} onChange={(value) => setAppFilter((f) => ({ ...f, graduationYear: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={appPagination.visible}
            columns={applicationColumns}
            sortKey={sortKey === "name" ? "name" : sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setStageApp(row)}
            onDelete={(row) => setDeleteTarget({ kind: "applications", id: row.id, label: row.studentName })}
            minWidth="min-w-[900px]"
          />
          <EntityPagination page={appPagination.page} pageCount={appPagination.pageCount} total={filteredApplications.length} onPage={appPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "interviews" ? (
        <EntityPanel
          title="Interview management"
          description="Schedule interview panels, links, and feedback."
          count={filteredInterviews.length}
          addLabel="Schedule interview"
          onAdd={() => setDialog({ kind: "interview", record: null })}
          onExport={() =>
            exportCsv(
              "interviews.csv",
              ["Student", "Company", "Role", "Date", "Time", "Panel", "Status"],
              filteredInterviews.map((i) => [i.studentName, companyName(i.companyId), i.role, i.date, i.time, i.panel, i.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search interviews by student, company, or panel…"
          onClearFilters={() => setQuery("")}
          filters={<p className="text-muted-foreground text-sm sm:col-span-2 lg:col-span-4">Use search to filter interviews.</p>}
        >
          <AcademicTable
            rows={interviewPagination.visible}
            columns={interviewColumns}
            sortKey={sortKey === "name" ? "name" : sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "interview", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "interviews", id: row.id, label: row.studentName })}
            minWidth="min-w-[1000px]"
          />
          <EntityPagination page={interviewPagination.page} pageCount={interviewPagination.pageCount} total={filteredInterviews.length} onPage={interviewPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "offers" ? (
        <EntityPanel
          title="Offer management"
          description="Offer letters, packages, and acceptance status."
          count={filteredOffers.length}
          addLabel="Release offer"
          onAdd={() => setDialog({ kind: "offer", record: null })}
          onExport={() =>
            exportCsv(
              "offers.csv",
              ["Student", "Company", "Role", "Department", "Salary", "Joining", "Expiry", "Status"],
              filteredOffers.map((o) => [o.studentName, companyName(o.companyId), o.role, o.department, o.salary, o.joiningDate, o.expiryDate, o.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search offers by student, company, or role…"
          onClearFilters={() => setOfferFilter({ status: "", department: "" })}
          filters={
            <>
              <EntityFilterSelect label="Status" value={offerFilter.status} options={[{ value: "released", label: "Released" }, { value: "accepted", label: "Accepted" }, { value: "declined", label: "Declined" }, { value: "expired", label: "Expired" }]} onChange={(value) => setOfferFilter((f) => ({ ...f, status: value }))} />
              <EntityFilterSelect label="Department" value={offerFilter.department} options={offerDepartments.map((d) => ({ value: d, label: d }))} onChange={(value) => setOfferFilter((f) => ({ ...f, department: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={offerPagination.visible}
            columns={offerColumns}
            sortKey={sortKey === "name" ? "name" : sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "offer", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "offers", id: row.id, label: row.studentName })}
            minWidth="min-w-[1000px]"
          />
          <EntityPagination page={offerPagination.page} pageCount={offerPagination.pageCount} total={filteredOffers.length} onPage={offerPagination.setPage} />
        </EntityPanel>
      ) : null}

      {tab === "eligibility" ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" aria-hidden="true" />Eligibility engine</CardTitle>
                <CardDescription>Automatically determine eligible students for a drive using CGPA, backlogs, department, and program criteria.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  exportCsv(
                    "eligible-students.csv",
                    ["Student", "Department", "CGPA", "Graduation", "Role"],
                    eligibleForDrive.map((a) => [a.studentName, a.department, a.cgpa, a.graduationYear, a.role]),
                  )
                }
              >
                Export eligible list
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-sm space-y-1.5">
              <Label>Select drive</Label>
              <select className="form-control" value={activeDriveId} onChange={(e) => setEligDriveId(e.target.value)} aria-label="Select drive for eligibility">
                {drives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {(() => {
              const drive = drives.find((d) => d.id === activeDriveId);
              if (!drive) return <p className="text-muted-foreground text-sm">Select a drive to compute eligibility.</p>;
              return (
                <div className="border-border bg-muted/20 flex flex-wrap gap-4 rounded-xl border p-4 text-sm">
                  <span><span className="text-muted-foreground">Min CGPA:</span> <span className="font-medium">{drive.minCgpa}</span></span>
                  <span><span className="text-muted-foreground">Max backlogs:</span> <span className="font-medium">{drive.maxBacklogs}</span></span>
                  <span><span className="text-muted-foreground">Departments:</span> <span className="font-medium">{drive.eligibleDepartments.join(", ") || "All"}</span></span>
                  <span><span className="text-muted-foreground">Eligible students:</span> <span className="font-medium">{eligibleForDrive.length}</span></span>
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <AcademicTable
                rows={eligibleForDrive}
                columns={[
                  { key: "studentName", header: "Student", cell: (row) => <span className="font-medium">{row.studentName}</span> },
                  { key: "department", header: "Department", cell: (row) => row.department },
                  { key: "cgpa", header: "CGPA", cell: (row) => row.cgpa },
                  { key: "graduationYear", header: "Graduation", cell: (row) => row.graduationYear || "—" },
                  { key: "role", header: "Applied Role", cell: (row) => row.role || "—" },
                  {
                    key: "eligible",
                    header: "Eligibility",
                    cell: (row) => (
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={
                            row.eligible
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : row.status === "conditionally_eligible"
                                ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                                : "border-destructive/40 text-destructive"
                          }
                        >
                          {String(row.status).replace(/_/g, " ")}
                        </Badge>
                        {row.reasons?.length ? (
                          <p className="text-muted-foreground max-w-xs text-xs">{row.reasons.join("; ")}</p>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No eligible students"
                emptyDescription="No candidates match this drive's criteria yet."
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CompanyProfileDrawer
        recruiter={selectedRecruiter}
        internships={internships}
        jobs={jobs}
        offers={offers}
        open={Boolean(selectedRecruiter)}
        onOpenChange={(open) => { if (!open) setSelectedRecruiterId(null); }}
        onEdit={(recruiter) => setDialog({ kind: "recruiter", record: recruiter })}
        onNotify={() => setNotifyOpen(true)}
      />

      {dialog?.kind === "recruiter" ? (
        <RecruiterDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertRecruiter} />
      ) : null}
      {dialog?.kind === "drive" ? (
        <DriveDialog key={dialog.record?.id ?? "new"} record={dialog.record} recruiters={recruiters} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={(record) => void store.upsertDrive(record, token ?? undefined)} />
      ) : null}
      {dialog?.kind === "internship" ? (
        <InternshipDialog key={dialog.record?.id ?? "new"} record={dialog.record} recruiters={recruiters} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={(record) => void store.upsertInternship(record, token ?? undefined)} />
      ) : null}
      {dialog?.kind === "job" ? (
        <JobDialog key={dialog.record?.id ?? "new"} record={dialog.record} recruiters={recruiters} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={(record) => void store.upsertJob(record, token ?? undefined)} />
      ) : null}
      {dialog?.kind === "interview" ? (
        <InterviewDialog key={dialog.record?.id ?? "new"} record={dialog.record} recruiters={recruiters} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertInterview} />
      ) : null}
      {dialog?.kind === "offer" ? (
        <OfferDialog key={dialog.record?.id ?? "new"} record={dialog.record} recruiters={recruiters} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertOffer} />
      ) : null}

      <ApplicationStageDialog application={stageApp} open={Boolean(stageApp)} onOpenChange={(open) => { if (!open) setStageApp(null); }} onSave={(id, stage) => void store.updateApplicationStage(id, stage, token ?? undefined)} />
      <PlacementNotificationDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        {...(activeDriveId ? { driveId: activeDriveId } : {})}
        {...(apiEnabled && token
          ? { onSend: (payload) => sendNotification(payload, token) }
          : {})}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete record"
        description={`Delete ${deleteTarget?.label ?? "this record"}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
