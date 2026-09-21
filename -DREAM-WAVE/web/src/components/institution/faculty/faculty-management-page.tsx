"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Download,
  FilterX,
  GraduationCap,
  Plus,
  Search,
  Send,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  FacultyAssignmentDialog,
  type FacultyAssignmentMode,
  FacultyFormDialog,
  FacultyNotificationDialog,
} from "@/components/institution/faculty/faculty-dialogs";
import { FacultyDirectoryTable } from "@/components/institution/faculty/faculty-directory-table";
import { FacultyProfileDrawer } from "@/components/institution/faculty/faculty-profile-drawer";
import {
  FACULTY_STATUS_OPTIONS,
} from "@/components/institution/faculty/faculty-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useFacultyManagementStore } from "@/store/faculty-management-store";
import type {
  FacultyFilters,
  FacultySortField,
  ManagedFaculty,
} from "@/types/faculty-management";

const EMPTY_FILTERS: FacultyFilters = {
  department: "",
  designation: "",
  employmentType: "",
  qualification: "",
  experience: "",
  status: "",
  joiningYear: "",
  specialization: "",
};

const PAGE_SIZE = 8;

function exportDirectory(faculty: ManagedFaculty[]) {
  const header = ["Employee ID", "Name", "Designation", "Department", "Qualification", "Experience", "Email", "Phone", "Employment Type", "Joining Date", "Status"];
  const rows = faculty.map((record) => [record.id, record.fullName, record.designation, record.department, record.highestQualification, record.totalExperience, record.email, record.phone, record.employmentType, record.joiningDate, record.status]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "faculty-directory.csv";
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
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className="form-control" value={value} aria-label={`Filter by ${label}`} onChange={(event) => onChange(event.target.value)}>
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

const toOptions = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

export function FacultyManagementPage() {
  const hydrated = useFacultyManagementStore((state) => state.hydrated);
  const hydrate = useFacultyManagementStore((state) => state.hydrate);
  const faculty = useFacultyManagementStore((state) => state.faculty);
  const addFaculty = useFacultyManagementStore((state) => state.addFaculty);
  const updateFaculty = useFacultyManagementStore((state) => state.updateFaculty);
  const transferDepartment = useFacultyManagementStore((state) => state.transferDepartment);
  const assignSubject = useFacultyManagementStore((state) => state.assignSubject);
  const assignMentor = useFacultyManagementStore((state) => state.assignMentor);
  const updateStatus = useFacultyManagementStore((state) => state.updateStatus);
  const addNote = useFacultyManagementStore((state) => state.addNote);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FacultyFilters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<FacultySortField>("fullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignment, setAssignment] = useState<{ id: string; mode: FacultyAssignmentMode } | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [notifyId, setNotifyId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const options = useMemo(() => ({
    departments: [...new Set(faculty.map((record) => record.department))].sort(),
    designations: [...new Set(faculty.map((record) => record.designation))].sort(),
    qualifications: [...new Set(faculty.map((record) => record.highestQualification))].sort(),
    years: [...new Set(faculty.map((record) => record.joiningDate.slice(0, 4)))].sort(),
    specializations: [...new Set(faculty.map((record) => record.specialization))].sort(),
  }), [faculty]);

  const filteredFaculty = useMemo(() => {
    const term = query.trim().toLowerCase();
    const records = faculty.filter((record) => {
      const searchable = [record.fullName, record.id, record.department, record.highestQualification, record.specialization, record.email, record.phone].join(" ").toLowerCase();
      const experienceMatch =
        !filters.experience ||
        (filters.experience === "0-5" && record.totalExperience <= 5) ||
        (filters.experience === "6-10" && record.totalExperience >= 6 && record.totalExperience <= 10) ||
        (filters.experience === "11-15" && record.totalExperience >= 11 && record.totalExperience <= 15) ||
        (filters.experience === "16+" && record.totalExperience >= 16);
      return (
        (!term || searchable.includes(term)) &&
        (!filters.department || record.department === filters.department) &&
        (!filters.designation || record.designation === filters.designation) &&
        (!filters.employmentType || record.employmentType === filters.employmentType) &&
        (!filters.qualification || record.highestQualification === filters.qualification) &&
        experienceMatch &&
        (!filters.status || record.status === filters.status) &&
        (!filters.joiningYear || record.joiningDate.startsWith(filters.joiningYear)) &&
        (!filters.specialization || record.specialization === filters.specialization)
      );
    });
    return records.toSorted((left, right) => {
      const result =
        sortField === "totalExperience"
          ? left.totalExperience - right.totalExperience
          : String(left[sortField]).localeCompare(String(right[sortField]), undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
  }, [faculty, filters, query, sortDirection, sortField]);

  const pageCount = Math.max(1, Math.ceil(filteredFaculty.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleFaculty = filteredFaculty.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const findFaculty = (id: string | null) => faculty.find((record) => record.id === id) ?? null;
  const selectedFaculty = findFaculty(selectedId);
  const formFaculty = findFaculty(formId);
  const assignmentFaculty = findFaculty(assignment?.id ?? null);
  const deactivateFaculty = findFaculty(deactivateId);
  const notificationFaculty = findFaculty(notifyId);

  const metrics = useMemo(() => [
    { label: "Total Faculty", value: faculty.length, hint: "Faculty and staff", icon: Users },
    { label: "Teaching Faculty", value: faculty.filter((record) => record.staffCategory === "teaching").length, hint: "Academic workforce", icon: GraduationCap },
    { label: "Non-Teaching Staff", value: faculty.filter((record) => record.staffCategory === "non-teaching").length, hint: "Operations workforce", icon: BriefcaseBusiness },
    { label: "Active Faculty", value: faculty.filter((record) => record.status === "active").length, hint: "Currently active", icon: UserCheck },
    { label: "Inactive Faculty", value: faculty.filter((record) => record.status === "inactive").length, hint: "Inactive records", icon: UserMinus },
    { label: "Departments", value: new Set(faculty.map((record) => record.department)).size, hint: "Faculty allocation", icon: Building2 },
    { label: "New Joinees", value: faculty.filter((record) => record.joiningDate.startsWith("2026")).length, hint: "Joined this year", icon: Users },
    { label: "Faculty on Leave", value: faculty.filter((record) => record.status === "on-leave").length, hint: "Current leave", icon: CalendarDays },
    { label: "Today's Classes", value: faculty.reduce((sum, record) => sum + Math.min(record.subjects.length, 2), 0), hint: "Schedule UI ready", icon: BookOpen },
  ] as const, [faculty]);

  const setFilter = useCallback((key: keyof FacultyFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const handleSort = useCallback((field: FacultySortField) => {
    if (field === sortField) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  }, [sortField]);

  if (!hydrated) return <RouteLoading label="Loading faculty management" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader eyebrow="Institution ERP" title="Faculty & Staff Management" description="Manage academic workforce, research profiles, teaching assignments, workload, and staff operations." actions={<Button type="button" className="h-10" onClick={() => { setFormId(null); setFormOpen(true); }}><Plus aria-hidden="true" />Add Faculty</Button>} />

      <nav aria-label="Faculty management sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.faculty} aria-current="page" className={buttonVariants({ variant: "default", size: "sm" })}>Directory</Link>
        <Link href={INSTITUTION_ROUTES.facultyAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>
        <Link href={INSTITUTION_ROUTES.facultyReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>Reports</Link>
      </nav>

      <section aria-labelledby="faculty-metrics-heading">
        <h2 id="faculty-metrics-heading" className="sr-only">Faculty metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{metrics.map((metric) => <InstitutionMetricCard key={metric.label} {...metric} />)}</div>
      </section>

      <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Faculty directory</CardTitle><CardDescription>Search, filter, sort, and manage faculty and staff records.</CardDescription></div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => exportDirectory(filteredFaculty)}><Download aria-hidden="true" />Export</Button><Button type="button" variant="outline" onClick={() => setNotifyId("__bulk__")}><Send aria-hidden="true" />Notify</Button></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative"><Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="h-11 pl-9" placeholder="Search faculty name, employee ID, department, qualification, specialization, email, phone…" aria-label="Search faculty directory" /></div>
          <details className="border-border rounded-xl border" open>
            <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">Advanced filters</summary>
            <div className="border-border grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Department" value={filters.department} options={toOptions(options.departments)} onChange={(value) => setFilter("department", value)} />
              <FilterSelect label="Designation" value={filters.designation} options={toOptions(options.designations)} onChange={(value) => setFilter("designation", value)} />
              <FilterSelect label="Employment Type" value={filters.employmentType} options={[{ value: "full-time", label: "Full Time" }, { value: "part-time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "guest", label: "Guest" }]} onChange={(value) => setFilter("employmentType", value)} />
              <FilterSelect label="Qualification" value={filters.qualification} options={toOptions(options.qualifications)} onChange={(value) => setFilter("qualification", value)} />
              <FilterSelect label="Experience" value={filters.experience} options={[{ value: "0-5", label: "0–5 years" }, { value: "6-10", label: "6–10 years" }, { value: "11-15", label: "11–15 years" }, { value: "16+", label: "16+ years" }]} onChange={(value) => setFilter("experience", value)} />
              <FilterSelect label="Status" value={filters.status} options={FACULTY_STATUS_OPTIONS} onChange={(value) => setFilter("status", value)} />
              <FilterSelect label="Joining Year" value={filters.joiningYear} options={toOptions(options.years)} onChange={(value) => setFilter("joiningYear", value)} />
              <FilterSelect label="Specialization" value={filters.specialization} options={toOptions(options.specializations)} onChange={(value) => setFilter("specialization", value)} />
              <div className="flex items-end sm:col-span-2 lg:col-span-4"><Button type="button" variant="ghost" onClick={() => { setFilters(EMPTY_FILTERS); setQuery(""); setPage(1); }}><FilterX aria-hidden="true" />Clear filters</Button></div>
            </div>
          </details>
          <p className="text-muted-foreground text-sm" aria-live="polite">{filteredFaculty.length} faculty record{filteredFaculty.length === 1 ? "" : "s"} found</p>
          <FacultyDirectoryTable faculty={visibleFaculty} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} onView={(record) => setSelectedId(record.id)} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">Showing {filteredFaculty.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filteredFaculty.length)} of {filteredFaculty.length}</p>
            <div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</Button><span className="text-muted-foreground text-xs">Page {safePage} of {pageCount}</span><Button type="button" size="sm" variant="outline" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next</Button></div>
          </div>
        </CardContent>
      </Card>

      <FacultyProfileDrawer faculty={selectedFaculty} open={Boolean(selectedFaculty)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} onEdit={(record) => { setFormId(record.id); setFormOpen(true); }} onTransfer={(record) => setAssignment({ id: record.id, mode: "transfer" })} onAssignSubject={(record) => setAssignment({ id: record.id, mode: "subject" })} onAssignMentor={(record) => setAssignment({ id: record.id, mode: "mentor" })} onDeactivate={(record) => setDeactivateId(record.id)} onNotify={(record) => setNotifyId(record.id)} onAddNote={(id, text) => addNote(id, text, "Academic Office")} />

      {formOpen ? <FacultyFormDialog key={formFaculty?.id ?? "new"} faculty={formFaculty} open onOpenChange={(open) => { if (!open) { setFormOpen(false); setFormId(null); } }} onCreate={(input) => { const record = addFaculty(input); setSelectedId(record.id); }} onUpdate={updateFaculty} /> : null}
      {assignment && assignmentFaculty ? <FacultyAssignmentDialog key={`${assignment.id}-${assignment.mode}`} faculty={assignmentFaculty} mode={assignment.mode} open onOpenChange={(open) => { if (!open) setAssignment(null); }} onTransfer={transferDepartment} onAssignSubject={assignSubject} onAssignMentor={assignMentor} /> : null}
      <FacultyNotificationDialog faculty={notificationFaculty} open={notifyId !== null} onOpenChange={(open) => { if (!open) setNotifyId(null); }} />
      <ConfirmDialog open={Boolean(deactivateFaculty)} onOpenChange={(open) => { if (!open) setDeactivateId(null); }} title="Deactivate faculty" description={`Deactivate ${deactivateFaculty?.fullName ?? "this faculty member"}? The profile will remain available.`} confirmLabel="Deactivate" destructive onConfirm={() => { if (deactivateFaculty) updateStatus(deactivateFaculty.id, "inactive"); }} />
    </div>
  );
}
