"use client";

import {
  AlertTriangle,
  BookOpen,
  Building2,
  Download,
  FilterX,
  GraduationCap,
  Search,
  Send,
  Upload,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Alert } from "@/components/ui/alert";
import {
  EditStudentDialog,
  ImportStudentsDialog,
  StudentNotificationDialog,
  TransferStudentDialog,
} from "@/components/institution/students/student-dialogs";
import { StudentDirectoryTable } from "@/components/institution/students/student-directory-table";
import {
  PLACEMENT_STATUS_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from "@/components/institution/students/student-management-ui";
import { StudentProfileDrawer } from "@/components/institution/students/student-profile-drawer";
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
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { useStudentManagementStore } from "@/store/student-management-store";
import type {
  ManagedStudent,
  StudentManagementFilters,
  StudentSortField,
} from "@/types/student-management";

const EMPTY_FILTERS: StudentManagementFilters = {
  department: "",
  course: "",
  semester: "",
  section: "",
  academicYear: "",
  admissionYear: "",
  gender: "",
  status: "",
  placementStatus: "",
  scholarshipStatus: "",
};

const PAGE_SIZE = 8;

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function exportDirectory(students: ManagedStudent[]) {
  const header = [
    "Student ID",
    "Roll Number",
    "Name",
    "Department",
    "Course",
    "Semester",
    "Section",
    "Academic Year",
    "Email",
    "Phone",
    "Status",
  ];
  const rows = students.map((student) => [
    student.id,
    student.rollNumber,
    student.fullName,
    student.department,
    student.course,
    student.semester,
    student.section,
    student.academicYear,
    student.email,
    student.phone,
    student.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "student-directory.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function StudentFilter({
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

function valuesToOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function StudentManagementPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const hydrated = useStudentManagementStore((state) => state.hydrated);
  const hydrate = useStudentManagementStore((state) => state.hydrate);
  const students = useStudentManagementStore((state) => state.students);
  const apiEnabled = useStudentManagementStore((state) => state.apiEnabled);
  const loading = useStudentManagementStore((state) => state.loading);
  const error = useStudentManagementStore((state) => state.error);
  const stats = useStudentManagementStore((state) => state.stats);
  const filterOptions = useStudentManagementStore((state) => state.filterOptions);
  const storePagination = useStudentManagementStore((state) => state.pagination);
  const fetchOverview = useStudentManagementStore((state) => state.fetchOverview);
  const fetchStudents = useStudentManagementStore((state) => state.fetchStudents);
  const updateStudent = useStudentManagementStore((state) => state.updateStudent);
  const transferStudent = useStudentManagementStore(
    (state) => state.transferStudent,
  );
  const promoteSemester = useStudentManagementStore(
    (state) => state.promoteSemester,
  );
  const updateStatus = useStudentManagementStore((state) => state.updateStatus);
  const addNote = useStudentManagementStore((state) => state.addNote);
  const importStudents = useStudentManagementStore(
    (state) => state.importStudents,
  );

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filters, setFilters] = useState<StudentManagementFilters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<StudentSortField>("fullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [notifyId, setNotifyId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();

  useEffect(() => {
    if (!useLiveApi || !token) return;
    void fetchOverview(token);
  }, [useLiveApi, token, fetchOverview]);

  useEffect(() => {
    if (!useLiveApi || !token) return;
    const controller = new AbortController();
    void fetchStudents(
      token,
      {
        q: debouncedQuery || undefined,
        department: filters.department || undefined,
        course: filters.course || undefined,
        semester: filters.semester || undefined,
        section: filters.section || undefined,
        academicYear: filters.academicYear || undefined,
        admissionYear: filters.admissionYear || undefined,
        gender: filters.gender || undefined,
        status: filters.status || undefined,
        placementStatus: filters.placementStatus || undefined,
        scholarshipStatus: filters.scholarshipStatus || undefined,
        sort: sortField === "id" ? "studentId" : sortField,
        sortDir: sortDirection,
        page: String(page),
        limit: String(PAGE_SIZE),
      },
      controller.signal,
    );
    return () => controller.abort();
  }, [
    useLiveApi,
    token,
    debouncedQuery,
    filters,
    sortField,
    sortDirection,
    page,
    fetchStudents,
  ]);

  const options = useMemo(
    () =>
      apiEnabled && filterOptions
        ? {
            departments: filterOptions.departments,
            courses: filterOptions.courses,
            semesters: filterOptions.semesters,
            sections: filterOptions.sections,
            academicYears: filterOptions.academicYears,
            admissionYears: filterOptions.admissionYears,
          }
        : {
            departments: [...new Set(students.map((student) => student.department))].sort(),
            courses: [...new Set(students.map((student) => student.course))].sort(),
            semesters: [...new Set(students.map((student) => student.semester))].sort(),
            sections: [...new Set(students.map((student) => student.section))].sort(),
            academicYears: [
              ...new Set(students.map((student) => student.academicYear)),
            ].sort(),
            admissionYears: [
              ...new Set(students.map((student) => student.admissionYear)),
            ].sort(),
          },
    [students, apiEnabled, filterOptions],
  );

  const filteredStudents = useMemo(() => {
    if (apiEnabled) return students;
    const term = query.trim().toLowerCase();
    const filtered = students.filter((student) => {
      const searchable = [
        student.fullName,
        student.rollNumber,
        student.id,
        student.email,
        student.phone,
        student.department,
        student.course,
        student.semester,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!term || searchable.includes(term)) &&
        (!filters.department || student.department === filters.department) &&
        (!filters.course || student.course === filters.course) &&
        (!filters.semester || student.semester === filters.semester) &&
        (!filters.section || student.section === filters.section) &&
        (!filters.academicYear ||
          student.academicYear === filters.academicYear) &&
        (!filters.admissionYear ||
          student.admissionYear === filters.admissionYear) &&
        (!filters.gender || student.gender === filters.gender) &&
        (!filters.status || student.status === filters.status) &&
        (!filters.placementStatus ||
          student.placement.status === filters.placementStatus) &&
        (!filters.scholarshipStatus ||
          student.scholarshipStatus === filters.scholarshipStatus)
      );
    });

    return filtered.toSorted((left, right) => {
      const result = String(left[sortField]).localeCompare(
        String(right[sortField]),
        undefined,
        { numeric: true },
      );
      return sortDirection === "asc" ? result : -result;
    });
  }, [filters, query, sortDirection, sortField, students, apiEnabled]);

  const pageCount = apiEnabled
    ? storePagination.pageCount
    : Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = apiEnabled ? storePagination.page : Math.min(page, pageCount);
  const visibleStudents = apiEnabled
    ? students
    : filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const totalCount = apiEnabled ? storePagination.total : filteredStudents.length;

  const findStudent = (id: string | null) =>
    students.find((student) => student.id === id) ?? null;
  const selectedStudent = findStudent(selectedId);
  const editStudent = findStudent(editId);
  const transferTarget = findStudent(transferId);
  const deactivateTarget = findStudent(deactivateId);
  const promoteTarget = findStudent(promoteId);
  const notificationTarget = findStudent(notifyId);

  const metrics = useMemo(() => {
    if (apiEnabled && stats) {
      return [
        { label: "Total Students", value: stats.total, hint: "All records", icon: Users },
        { label: "Active Students", value: stats.active, hint: "Currently enrolled", icon: UserCheck },
        { label: "Inactive Students", value: stats.inactive, hint: "Inactive records", icon: UserMinus },
        { label: "Graduated Students", value: stats.graduated, hint: "Alumni records", icon: GraduationCap },
        { label: "Departments", value: stats.departments, hint: "Academic units", icon: Building2 },
        { label: "Placement Ready", value: stats.placementReady, hint: "Career pipeline", icon: GraduationCap },
      ] as const;
    }
    const active = students.filter((student) => student.status === "active").length;
    const inactive = students.filter(
      (student) => student.status === "inactive",
    ).length;
    const graduated = students.filter(
      (student) => student.status === "graduated",
    ).length;
    const attention = students.filter(
      (student) =>
        student.attendance < 75 ||
        student.backlogs > 0 ||
        ["inactive", "suspended"].includes(student.status),
    ).length;
    return [
      { label: "Total Students", value: students.length, hint: "All records", icon: Users },
      { label: "Active Students", value: active, hint: "Currently enrolled", icon: UserCheck },
      { label: "Inactive Students", value: inactive, hint: "Inactive records", icon: UserMinus },
      { label: "Graduated Students", value: graduated, hint: "Alumni records", icon: GraduationCap },
      {
        label: "New Admissions",
        value: students.filter((student) => student.admissionYear === "2026").length,
        hint: "Current intake",
        icon: Users,
      },
      {
        label: "Departments",
        value: new Set(students.map((student) => student.department)).size,
        hint: "Academic units",
        icon: Building2,
      },
      {
        label: "Courses",
        value: new Set(students.map((student) => student.course)).size,
        hint: "Active programs",
        icon: BookOpen,
      },
      {
        label: "Placement Ready",
        value: students.filter((student) =>
          ["placement-ready", "interviewing", "placed"].includes(
            student.placement.status,
          ),
        ).length,
        hint: "Career pipeline",
        icon: GraduationCap,
      },
      {
        label: "Requiring Attention",
        value: attention,
        hint: "Academic or attendance",
        icon: AlertTriangle,
      },
    ] as const;
  }, [students, apiEnabled, stats]);

  const setFilter = useCallback(
    (key: keyof StudentManagementFilters, value: string) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    },
    [],
  );

  const handleSort = useCallback(
    (field: StudentSortField) => {
      if (sortField === field) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  if (!hydrated) return <RouteLoading label="Loading student management" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <InstitutionPageHeader
        eyebrow="Institution ERP"
        title="Student Management"
        description="Manage enrolled students, academic records, documents, performance, and placement readiness."
        actions={
          <Button type="button" className="h-10" onClick={() => setImportOpen(true)}>
            <Upload aria-hidden="true" />
            Import students
          </Button>
        }
      />

      <nav aria-label="Student management sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <Link href={INSTITUTION_ROUTES.students} aria-current="page" className={buttonVariants({ variant: "default", size: "sm" })}>
          Directory
        </Link>
        <Link href={INSTITUTION_ROUTES.studentTalent} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Talent Discovery
        </Link>
        <Link href={INSTITUTION_ROUTES.studentAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Analytics
        </Link>
        <Link href={INSTITUTION_ROUTES.studentReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reports
        </Link>
      </nav>

      <section aria-labelledby="student-metrics-heading">
        <h2 id="student-metrics-heading" className="sr-only">Student metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Student directory</CardTitle>
              <CardDescription>
                Search, filter, sort, and manage the complete student register.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload aria-hidden="true" />
                Bulk upload
              </Button>
              <Button type="button" variant="outline" onClick={() => exportDirectory(filteredStudents)}>
                <Download aria-hidden="true" />
                Export CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => setNotifyId("__bulk__")}>
                <Send aria-hidden="true" />
                Notify
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-11 pl-9"
              placeholder="Search name, roll number, student ID, email, phone, department, course, semester…"
              aria-label="Search student directory"
            />
          </div>

          <details className="border-border rounded-xl border" open>
            <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">
              Advanced filters
            </summary>
            <div className="border-border grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-5">
              <StudentFilter label="Department" value={filters.department} options={valuesToOptions(options.departments)} onChange={(value) => setFilter("department", value)} />
              <StudentFilter label="Course" value={filters.course} options={valuesToOptions(options.courses)} onChange={(value) => setFilter("course", value)} />
              <StudentFilter label="Semester" value={filters.semester} options={valuesToOptions(options.semesters)} onChange={(value) => setFilter("semester", value)} />
              <StudentFilter label="Section" value={filters.section} options={valuesToOptions(options.sections)} onChange={(value) => setFilter("section", value)} />
              <StudentFilter label="Academic Year" value={filters.academicYear} options={valuesToOptions(options.academicYears)} onChange={(value) => setFilter("academicYear", value)} />
              <StudentFilter label="Admission Year" value={filters.admissionYear} options={valuesToOptions(options.admissionYears)} onChange={(value) => setFilter("admissionYear", value)} />
              <StudentFilter label="Gender" value={filters.gender} options={valuesToOptions(["female", "male", "non-binary", "prefer-not-to-say"])} onChange={(value) => setFilter("gender", value)} />
              <StudentFilter label="Status" value={filters.status} options={STUDENT_STATUS_OPTIONS} onChange={(value) => setFilter("status", value)} />
              <StudentFilter label="Placement Status" value={filters.placementStatus} options={PLACEMENT_STATUS_OPTIONS} onChange={(value) => setFilter("placementStatus", value)} />
              <StudentFilter label="Scholarship Status" value={filters.scholarshipStatus} options={valuesToOptions(["none", "applied", "approved"])} onChange={(value) => setFilter("scholarshipStatus", value)} />
              <div className="flex items-end sm:col-span-2 lg:col-span-5">
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

          <p className="text-muted-foreground text-sm" aria-live="polite">
            {totalCount} student{totalCount === 1 ? "" : "s"} found
          </p>

          {loading && apiEnabled ? <RouteLoading label="Loading students" /> : null}

          <StudentDirectoryTable
            students={visibleStudents}
            sortField={sortField}
            sortDirection={sortDirection}
            searchQuery={debouncedQuery}
            onSort={handleSort}
            onView={(student) => setSelectedId(student.id)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Showing {totalCount ? (safePage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(safePage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground text-xs">Page {safePage} of {pageCount}</span>
              <Button type="button" size="sm" variant="outline" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <StudentProfileDrawer
        student={selectedStudent}
        open={Boolean(selectedStudent)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onEdit={(student) => setEditId(student.id)}
        onTransfer={(student) => setTransferId(student.id)}
        onPromote={(student) => setPromoteId(student.id)}
        onDeactivate={(student) => setDeactivateId(student.id)}
        onNotify={(student) => setNotifyId(student.id)}
        onAddNote={(id, text) => addNote(id, text, "Student Services", token ?? undefined)}
      />

      {editStudent ? (
        <EditStudentDialog
          key={editStudent.id}
          student={editStudent}
          open
          onOpenChange={(open) => {
            if (!open) setEditId(null);
          }}
          onSave={(id, patch) => void updateStudent(id, patch, token ?? undefined)}
        />
      ) : null}

      {transferTarget ? (
        <TransferStudentDialog
          key={transferTarget.id}
          student={transferTarget}
          open
          onOpenChange={(open) => {
            if (!open) setTransferId(null);
          }}
          onTransfer={(id, dept, course, section) =>
            void transferStudent(id, dept, course, section, token ?? undefined)
          }
        />
      ) : null}

      <ImportStudentsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (rows) => {
          const created = await importStudents(rows, token ?? undefined);
          if (created > 0) {
            toast({
              title: "Import completed",
              description: `${created} student${created === 1 ? "" : "s"} added to the directory.`,
              variant: "success",
            });
          } else {
            toast({
              title: "Import failed",
              description: "No rows were imported. Review the file and try again.",
              variant: "error",
            });
          }
          return created;
        }}
      />

      <StudentNotificationDialog
        student={notificationTarget}
        open={notifyId !== null}
        onOpenChange={(open) => {
          if (!open) setNotifyId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(promoteTarget)}
        onOpenChange={(open) => {
          if (!open) setPromoteId(null);
        }}
        title="Promote semester"
        description={`Promote ${promoteTarget?.fullName ?? "this student"} to the next semester?`}
        confirmLabel="Promote"
        onConfirm={() => {
          if (promoteTarget) void promoteSemester(promoteTarget.id, token ?? undefined);
        }}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title="Deactivate student"
        description={`Deactivate ${deactivateTarget?.fullName ?? "this student"}? Their record will remain available.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (deactivateTarget) void updateStatus(deactivateTarget.id, "inactive", token ?? undefined);
        }}
      />
    </div>
  );
}
