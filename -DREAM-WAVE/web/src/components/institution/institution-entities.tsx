"use client";

import {
  EntityForm,
  selectField,
  statusField,
} from "@/components/institution/entity-form";
import {
  EntityManager,
  statusColumn,
} from "@/components/institution/entity-manager";
import { useInstitutionStore } from "@/store/institution-store";
import type {
  Branch,
  ClassSection,
  Course,
  Department,
  InstitutionEntityStatus,
  InstitutionStudent,
  Member,
  Subject,
  Teacher,
} from "@/types/institution";

const STATUS_FILTER = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
];

function asStatus(value: string | undefined): InstitutionEntityStatus {
  if (value === "inactive" || value === "pending") return value;
  return "active";
}

export function DepartmentsPage() {
  const rows = useInstitutionStore((s) => s.departments);
  const upsert = useInstitutionStore((s) => s.upsertDepartment);
  const remove = useInstitutionStore((s) => s.removeDepartment);

  return (
    <EntityManager<Department>
      title="Departments"
      description="Manage academic departments, heads, and capacity."
      rows={rows}
      searchKeys={[(r) => r.name, (r) => r.code, (r) => r.head]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add department"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "code", header: "Code", cell: (r) => r.code },
        { key: "head", header: "Head", cell: (r) => r.head },
        {
          key: "counts",
          header: "Faculty / Students",
          cell: (r) => `${r.facultyCount} / ${r.studentCount}`,
        },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            code: initial?.code ?? "",
            head: initial?.head ?? "",
            facultyCount: String(initial?.facultyCount ?? 0),
            studentCount: String(initial?.studentCount ?? 0),
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "code", label: "Code", required: true },
            { name: "head", label: "Department head", required: true },
            { name: "facultyCount", label: "Faculty count", type: "number" },
            { name: "studentCount", label: "Student count", type: "number" },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Department, "id"> & { id?: string } = {
              name: values.name!,
              code: values.code!,
              head: values.head!,
              facultyCount: Number(values.facultyCount || 0),
              studentCount: Number(values.studentCount || 0),
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function BranchesPage() {
  const rows = useInstitutionStore((s) => s.branches);
  const upsert = useInstitutionStore((s) => s.upsertBranch);
  const remove = useInstitutionStore((s) => s.removeBranch);

  return (
    <EntityManager<Branch>
      title="Branches"
      description="Campuses and branch locations across your institution."
      rows={rows}
      searchKeys={[(r) => r.name, (r) => r.code, (r) => r.city]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add branch"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "code", header: "Code", cell: (r) => r.code },
        { key: "city", header: "City", cell: (r) => r.city },
        { key: "campus", header: "Campus", cell: (r) => r.campus },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            code: initial?.code ?? "",
            city: initial?.city ?? "",
            campus: initial?.campus ?? "",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "code", label: "Code", required: true },
            { name: "city", label: "City", required: true },
            { name: "campus", label: "Campus label", required: true },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Branch, "id"> & { id?: string } = {
              name: values.name!,
              code: values.code!,
              city: values.city!,
              campus: values.campus!,
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function CoursesPage() {
  const rows = useInstitutionStore((s) => s.courses);
  const departments = useInstitutionStore((s) => s.departments);
  const upsert = useInstitutionStore((s) => s.upsertCourse);
  const remove = useInstitutionStore((s) => s.removeCourse);
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  return (
    <EntityManager<Course>
      title="Courses"
      description="Programs and courses mapped to departments."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => r.code,
        (r) => deptMap[r.departmentId] || "",
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add course"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "code", header: "Code", cell: (r) => r.code },
        {
          key: "department",
          header: "Department",
          cell: (r) => deptMap[r.departmentId] || "—",
        },
        { key: "level", header: "Level", cell: (r) => r.level },
        { key: "duration", header: "Duration", cell: (r) => r.duration },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            code: initial?.code ?? "",
            departmentId: initial?.departmentId ?? departments[0]?.id ?? "",
            duration: initial?.duration ?? "",
            level: initial?.level ?? "undergraduate",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "code", label: "Code", required: true },
            selectField(
              "departmentId",
              "Department",
              departments.map((d) => ({ value: d.id, label: d.name })),
            ),
            { name: "duration", label: "Duration", required: true },
            {
              name: "level",
              label: "Level",
              type: "select",
              required: true,
              options: [
                { value: "certificate", label: "Certificate" },
                { value: "diploma", label: "Diploma" },
                { value: "undergraduate", label: "Undergraduate" },
                { value: "postgraduate", label: "Postgraduate" },
              ],
            },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Course, "id"> & { id?: string } = {
              name: values.name!,
              code: values.code!,
              departmentId: values.departmentId!,
              duration: values.duration!,
              level: (values.level || "undergraduate") as Course["level"],
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function SubjectsPage() {
  const rows = useInstitutionStore((s) => s.subjects);
  const courses = useInstitutionStore((s) => s.courses);
  const upsert = useInstitutionStore((s) => s.upsertSubject);
  const remove = useInstitutionStore((s) => s.removeSubject);
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <EntityManager<Subject>
      title="Subjects"
      description="Subject catalog with credits and course mapping."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => r.code,
        (r) => courseMap[r.courseId] || "",
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add subject"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "code", header: "Code", cell: (r) => r.code },
        {
          key: "course",
          header: "Course",
          cell: (r) => courseMap[r.courseId] || "—",
        },
        { key: "credits", header: "Credits", cell: (r) => r.credits },
        { key: "semester", header: "Term", cell: (r) => r.semester },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            code: initial?.code ?? "",
            courseId: initial?.courseId ?? courses[0]?.id ?? "",
            credits: String(initial?.credits ?? 3),
            semester: initial?.semester ?? "",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "code", label: "Code", required: true },
            selectField(
              "courseId",
              "Course",
              courses.map((c) => ({ value: c.id, label: c.name })),
            ),
            { name: "credits", label: "Credits", type: "number", required: true },
            { name: "semester", label: "Semester / term", required: true },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Subject, "id"> & { id?: string } = {
              name: values.name!,
              code: values.code!,
              courseId: values.courseId!,
              credits: Number(values.credits || 0),
              semester: values.semester!,
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function TeachersPage() {
  const rows = useInstitutionStore((s) => s.teachers);
  const departments = useInstitutionStore((s) => s.departments);
  const upsert = useInstitutionStore((s) => s.upsertTeacher);
  const remove = useInstitutionStore((s) => s.removeTeacher);
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  return (
    <EntityManager<Teacher>
      title="Teachers"
      description="Faculty roster, designations, and department assignment."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => r.email,
        (r) => deptMap[r.departmentId] || "",
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add teacher"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "email", header: "Email", cell: (r) => r.email },
        {
          key: "department",
          header: "Department",
          cell: (r) => deptMap[r.departmentId] || "—",
        },
        {
          key: "designation",
          header: "Designation",
          cell: (r) => r.designation,
        },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            email: initial?.email ?? "",
            departmentId: initial?.departmentId ?? departments[0]?.id ?? "",
            designation: initial?.designation ?? "",
            phone: initial?.phone ?? "",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            selectField(
              "departmentId",
              "Department",
              departments.map((d) => ({ value: d.id, label: d.name })),
            ),
            { name: "designation", label: "Designation", required: true },
            { name: "phone", label: "Phone", required: true },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Teacher, "id"> & { id?: string } = {
              name: values.name!,
              email: values.email!,
              departmentId: values.departmentId!,
              designation: values.designation!,
              phone: values.phone!,
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function StudentsPage() {
  const rows = useInstitutionStore((s) => s.students);
  const courses = useInstitutionStore((s) => s.courses);
  const upsert = useInstitutionStore((s) => s.upsertStudent);
  const remove = useInstitutionStore((s) => s.removeStudent);
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <EntityManager<InstitutionStudent>
      title="Students"
      description="Learner enrollment, course assignment, and status."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => r.email,
        (r) => r.enrollmentId,
        (r) => courseMap[r.courseId] || "",
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add student"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "enrollment", header: "Enrollment ID", cell: (r) => r.enrollmentId },
        {
          key: "course",
          header: "Course",
          cell: (r) => courseMap[r.courseId] || "—",
        },
        { key: "year", header: "Year", cell: (r) => r.year },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            email: initial?.email ?? "",
            enrollmentId: initial?.enrollmentId ?? "",
            courseId: initial?.courseId ?? courses[0]?.id ?? "",
            year: initial?.year ?? "1",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            {
              name: "enrollmentId",
              label: "Enrollment ID",
              required: true,
            },
            selectField(
              "courseId",
              "Course",
              courses.map((c) => ({ value: c.id, label: c.name })),
            ),
            { name: "year", label: "Year / batch", required: true },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<InstitutionStudent, "id"> & { id?: string } = {
              name: values.name!,
              email: values.email!,
              enrollmentId: values.enrollmentId!,
              courseId: values.courseId!,
              year: values.year!,
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function ClassesPage() {
  const rows = useInstitutionStore((s) => s.classes);
  const courses = useInstitutionStore((s) => s.courses);
  const teachers = useInstitutionStore((s) => s.teachers);
  const upsert = useInstitutionStore((s) => s.upsertClass);
  const remove = useInstitutionStore((s) => s.removeClass);
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));
  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]));

  return (
    <EntityManager<ClassSection>
      title="Classes"
      description="Class sections with room, schedule, and capacity."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => courseMap[r.courseId] || "",
        (r) => teacherMap[r.teacherId] || "",
        (r) => r.room,
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add class"
      columns={[
        { key: "name", header: "Class", cell: (r) => r.name },
        {
          key: "course",
          header: "Course",
          cell: (r) => courseMap[r.courseId] || "—",
        },
        {
          key: "teacher",
          header: "Teacher",
          cell: (r) => teacherMap[r.teacherId] || "—",
        },
        { key: "room", header: "Room", cell: (r) => r.room },
        {
          key: "capacity",
          header: "Enrolled",
          cell: (r) => `${r.enrolled}/${r.capacity}`,
        },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            courseId: initial?.courseId ?? courses[0]?.id ?? "",
            teacherId: initial?.teacherId ?? teachers[0]?.id ?? "",
            room: initial?.room ?? "",
            schedule: initial?.schedule ?? "",
            capacity: String(initial?.capacity ?? 30),
            enrolled: String(initial?.enrolled ?? 0),
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Class name", required: true },
            selectField(
              "courseId",
              "Course",
              courses.map((c) => ({ value: c.id, label: c.name })),
            ),
            selectField(
              "teacherId",
              "Teacher",
              teachers.map((t) => ({ value: t.id, label: t.name })),
            ),
            { name: "room", label: "Room", required: true },
            { name: "schedule", label: "Schedule", required: true },
            { name: "capacity", label: "Capacity", type: "number", required: true },
            { name: "enrolled", label: "Enrolled", type: "number", required: true },
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<ClassSection, "id"> & { id?: string } = {
              name: values.name!,
              courseId: values.courseId!,
              teacherId: values.teacherId!,
              room: values.room!,
              schedule: values.schedule!,
              capacity: Number(values.capacity || 0),
              enrolled: Number(values.enrolled || 0),
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}

export function MembersPage() {
  const rows = useInstitutionStore((s) => s.members);
  const departments = useInstitutionStore((s) => s.departments);
  const upsert = useInstitutionStore((s) => s.upsertMember);
  const remove = useInstitutionStore((s) => s.removeMember);
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  return (
    <EntityManager<Member>
      title="Members"
      description="Organization members and access roles."
      rows={rows}
      searchKeys={[
        (r) => r.name,
        (r) => r.email,
        (r) => r.role,
        (r) => deptMap[r.departmentId] || "",
      ]}
      filterOptions={STATUS_FILTER}
      getFilterValue={(r) => r.status}
      onDelete={remove}
      createLabel="Add member"
      columns={[
        { key: "name", header: "Name", cell: (r) => r.name },
        { key: "email", header: "Email", cell: (r) => r.email },
        { key: "role", header: "Role", cell: (r) => r.role },
        {
          key: "department",
          header: "Department",
          cell: (r) => deptMap[r.departmentId] || "—",
        },
        statusColumn(),
      ]}
      form={({ initial, onCancel, onSave }) => (
        <EntityForm
          initialValues={{
            name: initial?.name ?? "",
            email: initial?.email ?? "",
            role: initial?.role ?? "staff",
            departmentId: initial?.departmentId ?? departments[0]?.id ?? "",
            status: initial?.status ?? "active",
          }}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            {
              name: "role",
              label: "Role",
              type: "select",
              required: true,
              options: [
                { value: "admin", label: "Admin" },
                { value: "coordinator", label: "Coordinator" },
                { value: "faculty", label: "Faculty" },
                { value: "staff", label: "Staff" },
                { value: "viewer", label: "Viewer" },
              ],
            },
            selectField(
              "departmentId",
              "Department",
              departments.map((d) => ({ value: d.id, label: d.name })),
            ),
            statusField(),
          ]}
          onCancel={onCancel}
          onSubmit={(values) => {
            const payload: Omit<Member, "id"> & { id?: string } = {
              name: values.name!,
              email: values.email!,
              role: (values.role || "staff") as Member["role"],
              departmentId: values.departmentId!,
              status: asStatus(values.status),
            };
            if (initial?.id) payload.id = initial.id;
            upsert(payload);
            onSave();
          }}
        />
      )}
    />
  );
}
