"use client";

import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  FilterX,
  GraduationCap,
  Plus,
  Search,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  AdmissionNotificationDialog,
  ImportApplicationsDialog,
  InterviewSchedulerDialog,
  NewAdmissionDialog,
} from "@/components/institution/admissions/admission-dialogs";
import { AdmissionsTable } from "@/components/institution/admissions/admissions-table";
import { ADMISSION_STATUS_OPTIONS } from "@/components/institution/admissions/admissions-ui";
import { ApplicationDetailsDrawer } from "@/components/institution/admissions/application-details-drawer";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useAdmissionsStore } from "@/store/admissions-store";
import type {
  AdmissionApplication,
  AdmissionsFilters,
  AdmissionSortField,
} from "@/types/admissions";

const EMPTY_FILTERS: AdmissionsFilters = {
  department: "",
  course: "",
  status: "",
  qualification: "",
  applicationDate: "",
  state: "",
  city: "",
  admissionYear: "",
};

const PAGE_SIZE = 8;

function downloadApplications(applications: AdmissionApplication[]) {
  const header = [
    "Application ID",
    "Applicant",
    "Email",
    "Phone",
    "Department",
    "Course",
    "Qualification",
    "Application Date",
    "Status",
    "Assigned Officer",
  ];
  const rows = applications.map((application) => [
    application.id,
    application.fullName,
    application.email,
    application.phone,
    application.department,
    application.course,
    application.qualification,
    application.applicationDate,
    application.status,
    application.assignedOfficer,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "admission-applications.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        className="form-control"
        value={value}
        aria-label={`Filter by ${label}`}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdmissionsPage() {
  const hydrated = useAdmissionsStore((state) => state.hydrated);
  const hydrate = useAdmissionsStore((state) => state.hydrate);
  const applications = useAdmissionsStore((state) => state.applications);
  const addApplication = useAdmissionsStore((state) => state.addApplication);
  const importApplications = useAdmissionsStore(
    (state) => state.importApplications,
  );
  const updateStatus = useAdmissionsStore((state) => state.updateStatus);
  const updateInterview = useAdmissionsStore((state) => state.updateInterview);
  const addRemark = useAdmissionsStore((state) => state.addRemark);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AdmissionsFilters>(EMPTY_FILTERS);
  const [sortField, setSortField] =
    useState<AdmissionSortField>("applicationDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const options = useMemo(
    () => ({
      departments: [...new Set(applications.map((item) => item.department))].sort(),
      courses: [...new Set(applications.map((item) => item.course))].sort(),
      qualifications: [
        ...new Set(applications.map((item) => item.qualification)),
      ].sort(),
      states: [...new Set(applications.map((item) => item.state))].sort(),
      cities: [...new Set(applications.map((item) => item.city))].sort(),
      years: [...new Set(applications.map((item) => item.admissionYear))].sort(),
    }),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = applications.filter((application) => {
      const searchable = [
        application.fullName,
        application.id,
        application.email,
        application.phone,
        application.course,
        application.department,
        application.qualification,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!search || searchable.includes(search)) &&
        (!filters.department ||
          application.department === filters.department) &&
        (!filters.course || application.course === filters.course) &&
        (!filters.status || application.status === filters.status) &&
        (!filters.qualification ||
          application.qualification === filters.qualification) &&
        (!filters.applicationDate ||
          application.applicationDate === filters.applicationDate) &&
        (!filters.state || application.state === filters.state) &&
        (!filters.city || application.city === filters.city) &&
        (!filters.admissionYear ||
          application.admissionYear === filters.admissionYear)
      );
    });

    return filtered.toSorted((left, right) => {
      const leftValue = String(left[sortField]).toLowerCase();
      const rightValue = String(right[sortField]).toLowerCase();
      const result = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
      });
      return sortDirection === "asc" ? result : -result;
    });
  }, [applications, filters, query, sortDirection, sortField]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredApplications.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleApplications = filteredApplications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedApplication =
    applications.find((application) => application.id === selectedId) ?? null;
  const interviewApplication =
    applications.find((application) => application.id === interviewId) ?? null;

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const pending = applications.filter((application) =>
      [
        "pending",
        "document-verification",
        "interview-scheduled",
        "under-review",
        "waiting-list",
      ].includes(application.status),
    ).length;
    const approved = applications.filter((application) =>
      ["approved", "enrolled"].includes(application.status),
    ).length;
    const rejected = applications.filter(
      (application) => application.status === "rejected",
    ).length;
    const enrolled = applications.filter(
      (application) => application.status === "enrolled",
    ).length;
    const total = Math.max(applications.length, 1);

    return [
      {
        label: "Total Applications",
        value: applications.length,
        hint: "Current admission cycle",
        trend: "+12.4%",
        icon: Users,
      },
      {
        label: "Today's Applications",
        value: applications.filter(
          (application) => application.applicationDate === today,
        ).length,
        hint: "Received today",
        icon: CalendarCheck,
      },
      {
        label: "Pending Applications",
        value: pending,
        hint: "Require action",
        icon: FileSearch,
      },
      {
        label: "Approved Applications",
        value: approved,
        hint: "Approved or enrolled",
        icon: CheckCircle2,
      },
      {
        label: "Rejected Applications",
        value: rejected,
        hint: "Current cycle",
        icon: XCircle,
      },
      {
        label: "Applications This Month",
        value: applications.filter((application) =>
          application.applicationDate.startsWith(month),
        ).length,
        hint: "Month to date",
        icon: GraduationCap,
      },
      {
        label: "Admission Conversion",
        value: `${Math.round((approved / total) * 100)}%`,
        hint: "Applications approved",
        icon: TrendingUp,
      },
      {
        label: "Enrollment Rate",
        value: `${Math.round((enrolled / Math.max(approved, 1)) * 100)}%`,
        hint: "Approved to enrolled",
        icon: UserCheck,
      },
    ] as const;
  }, [applications]);

  const setFilter = useCallback(
    (key: keyof AdmissionsFilters, value: string) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    },
    [],
  );

  const handleSort = useCallback(
    (field: AdmissionSortField) => {
      if (field === sortField) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  if (!hydrated) return <RouteLoading label="Loading admissions" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution ERP"
        title="Admissions Management"
        description="Manage applications, document verification, interviews, decisions, and enrollment."
        actions={
          <Button type="button" className="h-10" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" />
            New admission
          </Button>
        }
      />

      <nav
        aria-label="Admissions sections"
        className="border-border flex flex-wrap gap-1 border-b pb-2"
      >
        <Link
          href={INSTITUTION_ROUTES.admissions}
          aria-current="page"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          Applications
        </Link>
        <Link
          href={INSTITUTION_ROUTES.admissionsAnalytics}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Analytics
        </Link>
        <Link
          href={INSTITUTION_ROUTES.admissionsReports}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Reports
        </Link>
      </nav>

      <section aria-labelledby="admission-metrics-heading">
        <h2 id="admission-metrics-heading" className="sr-only">
          Admission metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="admission-actions-heading" className="space-y-3">
        <div>
          <h2 id="admission-actions-heading" className="text-lg font-semibold">
            Quick actions
          </h2>
          <p className="text-muted-foreground text-sm">
            Execute common admission workflows.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            onClick={() => setNewOpen(true)}
          >
            <Plus aria-hidden="true" />
            New Admission
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            onClick={() => setImportOpen(true)}
          >
            <Upload aria-hidden="true" />
            Import Applications
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            onClick={() => downloadApplications(filteredApplications)}
          >
            <Download aria-hidden="true" />
            Export Reports
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            onClick={() => setFilter("status", "document-verification")}
          >
            <ClipboardCheck aria-hidden="true" />
            Verify Documents
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            disabled={!filteredApplications[0]}
            onClick={() => setInterviewId(filteredApplications[0]?.id ?? null)}
          >
            <CalendarClock aria-hidden="true" />
            Schedule Interview
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col"
            onClick={() => setNotificationOpen(true)}
          >
            <BellRing aria-hidden="true" />
            Send Notification
          </Button>
        </div>
      </section>

      <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Application register</CardTitle>
          <CardDescription>
            Search, filter, sort, and review all admission applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-11 pl-9"
              placeholder="Search name, application ID, email, phone, course, department, qualification…"
              aria-label="Search admission applications"
            />
          </div>

          <details className="border-border rounded-xl border" open>
            <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">
              Filters
            </summary>
            <div className="border-border grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="Department"
                value={filters.department}
                options={options.departments}
                onChange={(value) => setFilter("department", value)}
              />
              <FilterSelect
                label="Course"
                value={filters.course}
                options={options.courses}
                onChange={(value) => setFilter("course", value)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="admission-status-filter">Status</Label>
                <select
                  id="admission-status-filter"
                  className="form-control"
                  value={filters.status}
                  onChange={(event) => setFilter("status", event.target.value)}
                >
                  <option value="">All statuses</option>
                  {ADMISSION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <FilterSelect
                label="Qualification"
                value={filters.qualification}
                options={options.qualifications}
                onChange={(value) => setFilter("qualification", value)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="application-date-filter">Application Date</Label>
                <Input
                  id="application-date-filter"
                  type="date"
                  value={filters.applicationDate}
                  onChange={(event) =>
                    setFilter("applicationDate", event.target.value)
                  }
                />
              </div>
              <FilterSelect
                label="State"
                value={filters.state}
                options={options.states}
                onChange={(value) => setFilter("state", value)}
              />
              <FilterSelect
                label="City"
                value={filters.city}
                options={options.cities}
                onChange={(value) => setFilter("city", value)}
              />
              <FilterSelect
                label="Admission Year"
                value={filters.admissionYear}
                options={options.years}
                onChange={(value) => setFilter("admissionYear", value)}
              />
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setQuery("");
                    setPage(1);
                  }}
                >
                  <FilterX aria-hidden="true" />
                  Clear filters
                </Button>
              </div>
            </div>
          </details>

          <div aria-live="polite" className="text-muted-foreground text-sm">
            {filteredApplications.length} application
            {filteredApplications.length === 1 ? "" : "s"} found
          </div>

          <AdmissionsTable
            applications={visibleApplications}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onView={(application) => setSelectedId(application.id)}
            onScheduleInterview={(application) => setInterviewId(application.id)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Showing {filteredApplications.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}
              –{Math.min(safePage * PAGE_SIZE, filteredApplications.length)} of{" "}
              {filteredApplications.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-xs tabular-nums">
                Page {safePage} of {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ApplicationDetailsDrawer
        application={selectedApplication}
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onStatusChange={updateStatus}
        onScheduleInterview={(application) => setInterviewId(application.id)}
        onAddRemark={(id, text) => addRemark(id, text, "Admissions Admin")}
      />

      <NewAdmissionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={(input) => {
          const application = addApplication(input);
          setSelectedId(application.id);
        }}
      />

      <ImportApplicationsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importApplications}
      />

      {interviewApplication ? (
        <InterviewSchedulerDialog
          key={`${interviewApplication.id}-${interviewApplication.interview.status}`}
          application={interviewApplication}
          open
          onOpenChange={(open) => {
            if (!open) setInterviewId(null);
          }}
          onSave={updateInterview}
        />
      ) : null}

      <AdmissionNotificationDialog
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        recipientCount={filteredApplications.length}
      />
    </div>
  );
}
