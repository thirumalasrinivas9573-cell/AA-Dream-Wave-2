"use client";

import {
  BookMarked,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Coins,
  Download,
  FilterX,
  GraduationCap,
  Layers,
  LibraryBig,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { AcademicCalendar } from "@/components/institution/academics/academic-calendar";
import { CurriculumBuilder } from "@/components/institution/academics/academic-curriculum";
import {
  CourseDialog,
  DepartmentDialog,
  ProgramDialog,
  SemesterDialog,
  SubjectDialog,
} from "@/components/institution/academics/academic-dialogs";
import type { AcademicColumn } from "@/components/institution/academics/academic-table";
import { AcademicTable } from "@/components/institution/academics/academic-table";
import {
  ACADEMIC_STATUS_OPTIONS,
  AcademicStatusBadge,
  exportCsv,
  PROGRAM_LEVEL_OPTIONS,
} from "@/components/institution/academics/academic-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useAcademicManagementStore } from "@/store/academic-management-store";
import type {
  AcademicCourse,
  AcademicDepartment,
  AcademicProgram,
  AcademicSemester,
  AcademicSubject,
} from "@/types/academic-management";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "departments", label: "Departments" },
  { id: "programs", label: "Programs" },
  { id: "courses", label: "Courses" },
  { id: "subjects", label: "Subjects" },
  { id: "semesters", label: "Semesters" },
  { id: "curriculum", label: "Curriculum" },
  { id: "calendar", label: "Calendar" },
] as const;

type AcademicTab = (typeof TABS)[number]["id"];

const PAGE_SIZE = 6;

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EntityPanel({
  title,
  description,
  count,
  onAdd,
  addLabel,
  onExport,
  onImport,
  search,
  onSearch,
  searchPlaceholder,
  filters,
  onClearFilters,
  children,
}: {
  title: string;
  description: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  onExport: () => void;
  onImport: () => void;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  filters: ReactNode;
  onClearFilters: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onImport}>
              <Upload aria-hidden="true" />
              Import
            </Button>
            <Button type="button" variant="outline" onClick={onExport}>
              <Download aria-hidden="true" />
              Export
            </Button>
            <Button type="button" onClick={onAdd}>
              <Plus aria-hidden="true" />
              {addLabel}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="h-11 pl-9"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <details className="border-border rounded-xl border" open>
          <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">
            Filters
          </summary>
          <div className="border-border grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
            {filters}
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button type="button" variant="ghost" onClick={onClearFilters}>
                <FilterX aria-hidden="true" />
                Clear filters
              </Button>
            </div>
          </div>
        </details>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {count} record{count === 1 ? "" : "s"} found
        </p>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { page: safePage, setPage, pageCount, visible };
}

function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs">
        Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0}–
        {Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="text-muted-foreground text-xs">
          Page {page} of {pageCount}
        </span>
        <Button type="button" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function AcademicManagementPage({
  initialTab = "overview",
}: {
  initialTab?: AcademicTab;
}) {
  const store = useAcademicManagementStore();
  const {
    hydrated,
    hydrate,
    departments,
    programs,
    courses,
    subjects,
    semesters,
  } = store;

  const [tab, setTab] = useState<AcademicTab>(initialTab);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [deptFilter, setDeptFilter] = useState({ status: "" });
  const [programFilter, setProgramFilter] = useState({ level: "", departmentId: "", status: "" });
  const [courseFilter, setCourseFilter] = useState({ departmentId: "", semester: "", status: "", credits: "" });
  const [subjectFilter, setSubjectFilter] = useState({ semester: "", elective: "", lab: "" });
  const [semesterFilter, setSemesterFilter] = useState({ academicYear: "", status: "" });

  const [dialog, setDialog] = useState<
    | { kind: "department"; record: AcademicDepartment | null }
    | { kind: "program"; record: AcademicProgram | null }
    | { kind: "course"; record: AcademicCourse | null }
    | { kind: "subject"; record: AcademicSubject | null }
    | { kind: "semester"; record: AcademicSemester | null }
    | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: AcademicTab; id: string; label: string } | null
  >(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const departmentName = useCallback(
    (id: string) => departments.find((d) => d.id === id)?.name ?? "—",
    [departments],
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

  const changeTab = useCallback((next: AcademicTab) => {
    setTab(next);
    setQuery("");
    setSortKey("name");
    setSortDirection("asc");
  }, []);

  const metrics = useMemo(
    () =>
      [
        { label: "Total Departments", value: departments.length, hint: "Academic units", icon: Layers },
        { label: "Total Programs", value: programs.length, hint: "All levels", icon: GraduationCap },
        { label: "Total Courses", value: courses.length, hint: "Course catalogue", icon: BookOpen },
        { label: "Total Subjects", value: subjects.length, hint: "Subject catalogue", icon: BookMarked },
        { label: "Active Semesters", value: semesters.filter((s) => s.status === "active").length, hint: "Currently running", icon: CalendarRange },
        { label: "Academic Years", value: new Set(semesters.map((s) => s.academicYear)).size, hint: "Tracked years", icon: CalendarDays },
        { label: "Credits Offered", value: courses.reduce((sum, c) => sum + c.credits, 0), hint: "Across courses", icon: Coins },
        { label: "Elective Subjects", value: subjects.filter((s) => s.elective).length, hint: "Optional subjects", icon: LibraryBig },
      ] as const,
    [courses, departments.length, programs.length, semesters, subjects],
  );

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

  const filteredDepartments = useMemo(() => {
    return departments
      .filter(
        (d) =>
          (!term || [d.name, d.code, d.hod, d.description].join(" ").toLowerCase().includes(term)) &&
          (!deptFilter.status || d.status === deptFilter.status),
      )
      .toSorted((a, b) => compare(a[sortKey as keyof AcademicDepartment], b[sortKey as keyof AcademicDepartment]));
  }, [departments, term, deptFilter, compare, sortKey]);

  const filteredPrograms = useMemo(() => {
    return programs
      .filter(
        (p) =>
          (!term || [p.name, p.eligibility, p.duration].join(" ").toLowerCase().includes(term)) &&
          (!programFilter.level || p.level === programFilter.level) &&
          (!programFilter.departmentId || p.departmentId === programFilter.departmentId) &&
          (!programFilter.status || p.status === programFilter.status),
      )
      .toSorted((a, b) => compare(a[sortKey as keyof AcademicProgram], b[sortKey as keyof AcademicProgram]));
  }, [programs, term, programFilter, compare, sortKey]);

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        const creditMatch =
          !courseFilter.credits ||
          (courseFilter.credits === "0-2" && c.credits <= 2) ||
          (courseFilter.credits === "3-4" && c.credits >= 3 && c.credits <= 4) ||
          (courseFilter.credits === "5+" && c.credits >= 5);
        return (
          (!term || [c.name, c.code, c.facultyAssigned, c.prerequisites].join(" ").toLowerCase().includes(term)) &&
          (!courseFilter.departmentId || c.departmentId === courseFilter.departmentId) &&
          (!courseFilter.semester || c.semester === courseFilter.semester) &&
          (!courseFilter.status || c.status === courseFilter.status) &&
          creditMatch
        );
      })
      .toSorted((a, b) => compare(a[sortKey as keyof AcademicCourse], b[sortKey as keyof AcademicCourse]));
  }, [courses, term, courseFilter, compare, sortKey]);

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(
        (s) =>
          (!term || [s.name, s.code, s.faculty, s.description].join(" ").toLowerCase().includes(term)) &&
          (!subjectFilter.semester || s.semester === subjectFilter.semester) &&
          (!subjectFilter.elective || String(s.elective) === subjectFilter.elective) &&
          (!subjectFilter.lab || String(s.labRequired) === subjectFilter.lab),
      )
      .toSorted((a, b) => compare(a[sortKey as keyof AcademicSubject], b[sortKey as keyof AcademicSubject]));
  }, [subjects, term, subjectFilter, compare, sortKey]);

  const filteredSemesters = useMemo(() => {
    const key = sortKey === "name" ? "number" : sortKey;
    return semesters
      .filter(
        (s) =>
          (!term || [`semester ${s.number}`, s.academicYear].join(" ").toLowerCase().includes(term)) &&
          (!semesterFilter.academicYear || s.academicYear === semesterFilter.academicYear) &&
          (!semesterFilter.status || s.status === semesterFilter.status),
      )
      .toSorted((a, b) => compare(a[key as keyof AcademicSemester], b[key as keyof AcademicSemester]));
  }, [semesters, term, semesterFilter, compare, sortKey]);

  const courseSemesters = useMemo(
    () => [...new Set(courses.map((c) => c.semester))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [courses],
  );
  const subjectSemesters = useMemo(
    () => [...new Set(subjects.map((s) => s.semester))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [subjects],
  );
  const academicYears = useMemo(
    () => [...new Set(semesters.map((s) => s.academicYear))].sort(),
    [semesters],
  );

  const deptPagination = usePagination(filteredDepartments);
  const programPagination = usePagination(filteredPrograms);
  const coursePagination = usePagination(filteredCourses);
  const subjectPagination = usePagination(filteredSubjects);
  const semesterPagination = usePagination(filteredSemesters);

  const departmentColumns: Array<AcademicColumn<AcademicDepartment>> = [
    {
      key: "name",
      header: "Department",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl text-xs font-semibold">
            {row.logoInitials}
          </span>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-muted-foreground text-xs">{row.code}</p>
          </div>
        </div>
      ),
    },
    { key: "hod", header: "HOD", sortable: true, cell: (row) => row.hod },
    { key: "facultyCount", header: "Faculty", sortable: true, cell: (row) => row.facultyCount },
    { key: "studentCount", header: "Students", sortable: true, cell: (row) => row.studentCount },
    { key: "status", header: "Status", sortable: true, cell: (row) => <AcademicStatusBadge status={row.status} /> },
  ];

  const programColumns: Array<AcademicColumn<AcademicProgram>> = [
    { key: "name", header: "Program", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "level", header: "Level", sortable: true, cell: (row) => <Badge variant="outline" className="capitalize">{row.level}</Badge> },
    { key: "departmentId", header: "Department", cell: (row) => departmentName(row.departmentId) },
    { key: "duration", header: "Duration", sortable: true, cell: (row) => row.duration },
    { key: "credits", header: "Credits", sortable: true, cell: (row) => row.credits },
    { key: "status", header: "Status", sortable: true, cell: (row) => <AcademicStatusBadge status={row.status} /> },
  ];

  const courseColumns: Array<AcademicColumn<AcademicCourse>> = [
    { key: "name", header: "Course", sortable: true, cell: (row) => <div><p className="font-medium">{row.name}</p><p className="text-muted-foreground text-xs">{row.code}</p></div> },
    { key: "departmentId", header: "Department", cell: (row) => departmentName(row.departmentId) },
    { key: "semester", header: "Semester", sortable: true, cell: (row) => row.semester },
    { key: "credits", header: "Credits", sortable: true, cell: (row) => row.credits },
    { key: "hours", header: "Theory / Practical", cell: (row) => `${row.theoryHours}h / ${row.practicalHours}h` },
    { key: "facultyAssigned", header: "Faculty", sortable: true, cell: (row) => row.facultyAssigned },
    { key: "status", header: "Status", sortable: true, cell: (row) => <AcademicStatusBadge status={row.status} /> },
  ];

  const subjectColumns: Array<AcademicColumn<AcademicSubject>> = [
    { key: "name", header: "Subject", sortable: true, cell: (row) => <div><p className="font-medium">{row.name}</p><p className="text-muted-foreground text-xs">{row.code}</p></div> },
    { key: "semester", header: "Semester", sortable: true, cell: (row) => row.semester },
    { key: "credits", header: "Credits", sortable: true, cell: (row) => row.credits },
    { key: "faculty", header: "Faculty", sortable: true, cell: (row) => row.faculty },
    { key: "type", header: "Type", cell: (row) => (
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{row.elective ? "Elective" : "Core"}</Badge>
        {row.labRequired ? <Badge variant="outline">Lab</Badge> : null}
      </div>
    ) },
  ];

  const semesterColumns: Array<AcademicColumn<AcademicSemester>> = [
    { key: "number", header: "Semester", sortable: true, cell: (row) => `Semester ${row.number}` },
    { key: "academicYear", header: "Academic Year", sortable: true, cell: (row) => row.academicYear },
    { key: "duration", header: "Duration", cell: (row) => row.duration },
    { key: "period", header: "Period", cell: (row) => `${row.startDate || "TBD"} → ${row.endDate || "TBD"}` },
    { key: "subjectsIncluded", header: "Subjects", sortable: true, cell: (row) => row.subjectsIncluded },
    { key: "credits", header: "Credits", sortable: true, cell: (row) => row.credits },
    { key: "status", header: "Status", sortable: true, cell: (row) => <AcademicStatusBadge status={row.status} /> },
  ];

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    if (kind === "departments") store.removeDepartment(id);
    if (kind === "programs") store.removeProgram(id);
    if (kind === "courses") store.removeCourse(id);
    if (kind === "subjects") store.removeSubject(id);
    if (kind === "semesters") store.removeSemester(id);
  };

  const importNotice = () =>
    window.alert(
      "Import CSV / Excel / bulk upload is wired to the institution data pipeline. Connect a file to ingest records.",
    );

  if (!hydrated) return <RouteLoading label="Loading academic structure" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution ERP"
        title="Academic Structure Management"
        description="Manage departments, programs, courses, subjects, semesters, curriculum, and the academic calendar."
        actions={
          <Button type="button" className="h-10" onClick={() => setDialog({ kind: "department", record: null })}>
            <Plus aria-hidden="true" />
            Add Department
          </Button>
        }
      />

      <nav aria-label="Academic sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Structure</span>
        <Link href={INSTITUTION_ROUTES.academicsAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Analytics
        </Link>
        <Link href={INSTITUTION_ROUTES.academicsReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reports
        </Link>
      </nav>

      <section aria-labelledby="academic-metrics-heading">
        <h2 id="academic-metrics-heading" className="sr-only">
          Academic metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div role="tablist" aria-label="Academic modules" className="flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={buttonVariants({
              variant: tab === item.id ? "default" : "ghost",
              size: "sm",
            })}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id} className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl text-sm font-semibold">
                      {dept.logoInitials}
                    </span>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <CardDescription>{dept.code} · {dept.hod}</CardDescription>
                    </div>
                  </div>
                  <AcademicStatusBadge status={dept.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground line-clamp-2 text-sm">{dept.description}</p>
                <div className="flex gap-4 text-sm">
                  <span><span className="font-semibold">{dept.facultyCount}</span> <span className="text-muted-foreground">faculty</span></span>
                  <span><span className="font-semibold">{dept.studentCount}</span> <span className="text-muted-foreground">students</span></span>
                  <span><span className="font-semibold">{programs.filter((p) => p.departmentId === dept.id).length}</span> <span className="text-muted-foreground">programs</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "departments" ? (
        <EntityPanel
          title="Departments"
          description="Manage academic departments, leadership, and charter."
          count={filteredDepartments.length}
          addLabel="Add department"
          onAdd={() => setDialog({ kind: "department", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "departments.csv",
              ["Code", "Name", "HOD", "Faculty", "Students", "Status"],
              filteredDepartments.map((d) => [d.code, d.name, d.hod, d.facultyCount, d.studentCount, d.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search departments by name, code, or HOD…"
          onClearFilters={() => setDeptFilter({ status: "" })}
          filters={
            <FilterSelect label="Status" value={deptFilter.status} options={ACADEMIC_STATUS_OPTIONS} onChange={(value) => setDeptFilter({ status: value })} />
          }
        >
          <AcademicTable
            rows={deptPagination.visible}
            columns={departmentColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "department", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "departments", id: row.id, label: row.name })}
          />
          <div className="pt-4">
            <Pagination page={deptPagination.page} pageCount={deptPagination.pageCount} total={filteredDepartments.length} onPage={deptPagination.setPage} />
          </div>
        </EntityPanel>
      ) : null}

      {tab === "programs" ? (
        <EntityPanel
          title="Academic programs"
          description="Undergraduate, postgraduate, diploma, certificate, and training programs."
          count={filteredPrograms.length}
          addLabel="Add program"
          onAdd={() => setDialog({ kind: "program", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "programs.csv",
              ["Name", "Level", "Department", "Duration", "Credits", "Status"],
              filteredPrograms.map((p) => [p.name, p.level, departmentName(p.departmentId), p.duration, p.credits, p.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search programs by name or eligibility…"
          onClearFilters={() => setProgramFilter({ level: "", departmentId: "", status: "" })}
          filters={
            <>
              <FilterSelect label="Level" value={programFilter.level} options={PROGRAM_LEVEL_OPTIONS} onChange={(value) => setProgramFilter((f) => ({ ...f, level: value }))} />
              <FilterSelect label="Department" value={programFilter.departmentId} options={departments.map((d) => ({ value: d.id, label: d.name }))} onChange={(value) => setProgramFilter((f) => ({ ...f, departmentId: value }))} />
              <FilterSelect label="Status" value={programFilter.status} options={ACADEMIC_STATUS_OPTIONS} onChange={(value) => setProgramFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={programPagination.visible}
            columns={programColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "program", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "programs", id: row.id, label: row.name })}
          />
          <div className="pt-4">
            <Pagination page={programPagination.page} pageCount={programPagination.pageCount} total={filteredPrograms.length} onPage={programPagination.setPage} />
          </div>
        </EntityPanel>
      ) : null}

      {tab === "courses" ? (
        <EntityPanel
          title="Courses"
          description="Course catalogue with credits, hours, faculty, and prerequisites."
          count={filteredCourses.length}
          addLabel="Add course"
          onAdd={() => setDialog({ kind: "course", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "courses.csv",
              ["Code", "Name", "Department", "Semester", "Credits", "Theory", "Practical", "Faculty", "Status"],
              filteredCourses.map((c) => [c.code, c.name, departmentName(c.departmentId), c.semester, c.credits, c.theoryHours, c.practicalHours, c.facultyAssigned, c.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search courses by name, code, or faculty…"
          onClearFilters={() => setCourseFilter({ departmentId: "", semester: "", status: "", credits: "" })}
          filters={
            <>
              <FilterSelect label="Department" value={courseFilter.departmentId} options={departments.map((d) => ({ value: d.id, label: d.name }))} onChange={(value) => setCourseFilter((f) => ({ ...f, departmentId: value }))} />
              <FilterSelect label="Semester" value={courseFilter.semester} options={courseSemesters.map((s) => ({ value: s, label: s }))} onChange={(value) => setCourseFilter((f) => ({ ...f, semester: value }))} />
              <FilterSelect label="Credits" value={courseFilter.credits} options={[{ value: "0-2", label: "0–2" }, { value: "3-4", label: "3–4" }, { value: "5+", label: "5+" }]} onChange={(value) => setCourseFilter((f) => ({ ...f, credits: value }))} />
              <FilterSelect label="Status" value={courseFilter.status} options={ACADEMIC_STATUS_OPTIONS} onChange={(value) => setCourseFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={coursePagination.visible}
            columns={courseColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "course", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "courses", id: row.id, label: row.name })}
          />
          <div className="pt-4">
            <Pagination page={coursePagination.page} pageCount={coursePagination.pageCount} total={filteredCourses.length} onPage={coursePagination.setPage} />
          </div>
        </EntityPanel>
      ) : null}

      {tab === "subjects" ? (
        <EntityPanel
          title="Subjects"
          description="Subject catalogue with credits, faculty, labs, and electives."
          count={filteredSubjects.length}
          addLabel="Add subject"
          onAdd={() => setDialog({ kind: "subject", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "subjects.csv",
              ["Code", "Name", "Semester", "Credits", "Faculty", "Lab", "Elective"],
              filteredSubjects.map((s) => [s.code, s.name, s.semester, s.credits, s.faculty, s.labRequired, s.elective]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search subjects by name, code, or faculty…"
          onClearFilters={() => setSubjectFilter({ semester: "", elective: "", lab: "" })}
          filters={
            <>
              <FilterSelect label="Semester" value={subjectFilter.semester} options={subjectSemesters.map((s) => ({ value: s, label: s }))} onChange={(value) => setSubjectFilter((f) => ({ ...f, semester: value }))} />
              <FilterSelect label="Elective" value={subjectFilter.elective} options={[{ value: "true", label: "Elective" }, { value: "false", label: "Core" }]} onChange={(value) => setSubjectFilter((f) => ({ ...f, elective: value }))} />
              <FilterSelect label="Lab" value={subjectFilter.lab} options={[{ value: "true", label: "Lab required" }, { value: "false", label: "No lab" }]} onChange={(value) => setSubjectFilter((f) => ({ ...f, lab: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={subjectPagination.visible}
            columns={subjectColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "subject", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "subjects", id: row.id, label: row.name })}
          />
          <div className="pt-4">
            <Pagination page={subjectPagination.page} pageCount={subjectPagination.pageCount} total={filteredSubjects.length} onPage={subjectPagination.setPage} />
          </div>
        </EntityPanel>
      ) : null}

      {tab === "semesters" ? (
        <EntityPanel
          title="Semesters"
          description="Semester schedules, academic years, subject load, and credits."
          count={filteredSemesters.length}
          addLabel="Add semester"
          onAdd={() => setDialog({ kind: "semester", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "semesters.csv",
              ["Semester", "Academic Year", "Duration", "Start", "End", "Subjects", "Credits", "Status"],
              filteredSemesters.map((s) => [`Semester ${s.number}`, s.academicYear, s.duration, s.startDate, s.endDate, s.subjectsIncluded, s.credits, s.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search semesters by number or academic year…"
          onClearFilters={() => setSemesterFilter({ academicYear: "", status: "" })}
          filters={
            <>
              <FilterSelect label="Academic Year" value={semesterFilter.academicYear} options={academicYears.map((y) => ({ value: y, label: y }))} onChange={(value) => setSemesterFilter((f) => ({ ...f, academicYear: value }))} />
              <FilterSelect label="Status" value={semesterFilter.status} options={ACADEMIC_STATUS_OPTIONS} onChange={(value) => setSemesterFilter((f) => ({ ...f, status: value }))} />
            </>
          }
        >
          <AcademicTable
            rows={semesterPagination.visible}
            columns={semesterColumns}
            sortKey={sortKey === "name" ? "number" : sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => setDialog({ kind: "semester", record: row })}
            onDelete={(row) => setDeleteTarget({ kind: "semesters", id: row.id, label: `Semester ${row.number}` })}
          />
          <div className="pt-4">
            <Pagination page={semesterPagination.page} pageCount={semesterPagination.pageCount} total={filteredSemesters.length} onPage={semesterPagination.setPage} />
          </div>
        </EntityPanel>
      ) : null}

      {tab === "curriculum" ? <CurriculumBuilder /> : null}
      {tab === "calendar" ? <AcademicCalendar /> : null}

      {dialog?.kind === "department" ? (
        <DepartmentDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertDepartment} />
      ) : null}
      {dialog?.kind === "program" ? (
        <ProgramDialog key={dialog.record?.id ?? "new"} record={dialog.record} departments={departments} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertProgram} />
      ) : null}
      {dialog?.kind === "course" ? (
        <CourseDialog key={dialog.record?.id ?? "new"} record={dialog.record} departments={departments} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertCourse} />
      ) : null}
      {dialog?.kind === "subject" ? (
        <SubjectDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertSubject} />
      ) : null}
      {dialog?.kind === "semester" ? (
        <SemesterDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertSemester} />
      ) : null}

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
