"use client";

import { type FormEvent, useState } from "react";

import {
  ACADEMIC_STATUS_OPTIONS,
  AcademicField,
  PROGRAM_LEVEL_OPTIONS,
} from "@/components/institution/academics/academic-ui";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  AcademicCalendarEvent,
  AcademicCourse,
  AcademicDepartment,
  AcademicProgram,
  AcademicSemester,
  AcademicStatus,
  AcademicSubject,
  CurriculumComponent,
  ProgramLevel,
} from "@/types/academic-management";

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function StatusField({
  value,
  onChange,
}: {
  value: AcademicStatus;
  onChange: (value: AcademicStatus) => void;
}) {
  return (
    <AcademicField label="Status">
      <select
        className="form-control"
        value={value}
        onChange={(event) => onChange(event.target.value as AcademicStatus)}
      >
        {ACADEMIC_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </AcademicField>
  );
}

function DialogActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 sm:col-span-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}

export function DepartmentDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: AcademicDepartment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicDepartment) => void;
}) {
  const [form, setForm] = useState<AcademicDepartment>(
    () =>
      record ?? {
        id: makeId("dept"),
        name: "",
        code: "",
        logoInitials: "",
        description: "",
        hod: "",
        vision: "",
        mission: "",
        facultyCount: 0,
        studentCount: 0,
        status: "active",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      logoInitials:
        form.logoInitials ||
        form.code.slice(0, 2).toUpperCase() ||
        form.name.slice(0, 2).toUpperCase(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit department" : "Add department"}
      description="Maintain department identity, leadership, and academic charter."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Department name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Department code">
          <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </AcademicField>
        <AcademicField label="HOD assignment">
          <Input required value={form.hod} onChange={(e) => setForm({ ...form, hod: e.target.value })} />
        </AcademicField>
        <AcademicField label="Logo initials">
          <Input maxLength={3} value={form.logoInitials} onChange={(e) => setForm({ ...form, logoInitials: e.target.value.toUpperCase() })} placeholder="Auto from code" />
        </AcademicField>
        <AcademicField label="Faculty count">
          <Input type="number" min="0" value={form.facultyCount} onChange={(e) => setForm({ ...form, facultyCount: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Student count">
          <Input type="number" min="0" value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </AcademicField>
        <AcademicField label="Vision">
          <Textarea rows={2} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
        </AcademicField>
        <AcademicField label="Mission">
          <Textarea rows={2} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
        </AcademicField>
        <StatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add department"} />
      </form>
    </Dialog>
  );
}

export function ProgramDialog({
  record,
  departments,
  open,
  onOpenChange,
  onSave,
}: {
  record: AcademicProgram | null;
  departments: AcademicDepartment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicProgram) => void;
}) {
  const [form, setForm] = useState<AcademicProgram>(
    () =>
      record ?? {
        id: makeId("prog"),
        name: "",
        level: "undergraduate",
        duration: "",
        credits: 0,
        eligibility: "",
        departmentId: departments[0]?.id ?? "",
        status: "active",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit program" : "Add program"}
      description="Configure academic program structure and eligibility."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Program name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Level">
          <select className="form-control" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as ProgramLevel })}>
            {PROGRAM_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </AcademicField>
        <AcademicField label="Department">
          <select className="form-control" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </AcademicField>
        <AcademicField label="Duration">
          <Input required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 4 years" />
        </AcademicField>
        <AcademicField label="Credits">
          <Input required type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Eligibility">
          <Input required value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
        </AcademicField>
        <StatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add program"} />
      </form>
    </Dialog>
  );
}

export function CourseDialog({
  record,
  departments,
  open,
  onOpenChange,
  onSave,
}: {
  record: AcademicCourse | null;
  departments: AcademicDepartment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicCourse) => void;
}) {
  const [form, setForm] = useState<AcademicCourse>(
    () =>
      record ?? {
        id: makeId("crs"),
        name: "",
        code: "",
        departmentId: departments[0]?.id ?? "",
        semester: "Semester 1",
        credits: 0,
        theoryHours: 0,
        practicalHours: 0,
        facultyAssigned: "",
        prerequisites: "",
        status: "active",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit course" : "Add course"}
      description="Define course credits, hours, faculty, and prerequisites."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Course name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Course code">
          <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </AcademicField>
        <AcademicField label="Department">
          <select className="form-control" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </AcademicField>
        <AcademicField label="Semester">
          <Input required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        </AcademicField>
        <AcademicField label="Credits">
          <Input required type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Faculty assigned">
          <Input required value={form.facultyAssigned} onChange={(e) => setForm({ ...form, facultyAssigned: e.target.value })} />
        </AcademicField>
        <AcademicField label="Theory hours">
          <Input required type="number" min="0" value={form.theoryHours} onChange={(e) => setForm({ ...form, theoryHours: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Practical hours">
          <Input required type="number" min="0" value={form.practicalHours} onChange={(e) => setForm({ ...form, practicalHours: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Prerequisites" className="sm:col-span-2">
          <Input value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: e.target.value })} placeholder="Comma separated" />
        </AcademicField>
        <StatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add course"} />
      </form>
    </Dialog>
  );
}

export function SubjectDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: AcademicSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicSubject) => void;
}) {
  const [form, setForm] = useState<AcademicSubject>(
    () =>
      record ?? {
        id: makeId("sub"),
        name: "",
        code: "",
        semester: "Semester 1",
        credits: 0,
        faculty: "",
        labRequired: false,
        elective: false,
        description: "",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit subject" : "Add subject"}
      description="Maintain subject credits, faculty, and classification."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Subject name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Subject code">
          <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </AcademicField>
        <AcademicField label="Semester">
          <Input required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        </AcademicField>
        <AcademicField label="Credits">
          <Input required type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Faculty">
          <Input required value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />
        </AcademicField>
        <div className="flex items-end gap-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 rounded border-input" checked={form.labRequired} onChange={(e) => setForm({ ...form, labRequired: e.target.checked })} />
            Lab required
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 rounded border-input" checked={form.elective} onChange={(e) => setForm({ ...form, elective: e.target.checked })} />
            Elective
          </label>
        </div>
        <AcademicField label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add subject"} />
      </form>
    </Dialog>
  );
}

export function SemesterDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: AcademicSemester | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicSemester) => void;
}) {
  const [form, setForm] = useState<AcademicSemester>(
    () =>
      record ?? {
        id: makeId("sem"),
        number: 1,
        academicYear: "2026-27",
        duration: "6 months",
        startDate: "",
        endDate: "",
        subjectsIncluded: 0,
        credits: 0,
        status: "active",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit semester" : "Add semester"}
      description="Manage semester schedule, credits, and subject load."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Semester number">
          <Input required type="number" min="1" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Academic year">
          <Input required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
        </AcademicField>
        <AcademicField label="Duration">
          <Input required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        </AcademicField>
        <AcademicField label="Subjects included">
          <Input required type="number" min="0" value={form.subjectsIncluded} onChange={(e) => setForm({ ...form, subjectsIncluded: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Start date">
          <Input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </AcademicField>
        <AcademicField label="End date">
          <Input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </AcademicField>
        <AcademicField label="Credits">
          <Input required type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </AcademicField>
        <StatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add semester"} />
      </form>
    </Dialog>
  );
}

export function CurriculumDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: CurriculumComponent) => void;
}) {
  const [form, setForm] = useState<CurriculumComponent>({
    id: makeId("cur"),
    semester: "Semester 1",
    subject: "",
    type: "core",
    credits: 0,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...form, id: makeId("cur") });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add curriculum component"
      description="Map a subject to a semester with its credit type."
      className="max-w-lg"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Semester">
          <Input required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        </AcademicField>
        <AcademicField label="Subject">
          <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </AcademicField>
        <AcademicField label="Type">
          <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CurriculumComponent["type"] })}>
            <option value="core">Core / Mandatory</option>
            <option value="elective">Elective</option>
            <option value="lab">Lab</option>
            <option value="project">Project</option>
            <option value="internship">Internship</option>
          </select>
        </AcademicField>
        <AcademicField label="Credits">
          <Input required type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel="Add component" />
      </form>
    </Dialog>
  );
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AcademicCalendarEvent) => void;
}) {
  const [form, setForm] = useState<AcademicCalendarEvent>({
    id: makeId("cal"),
    title: "",
    type: "event",
    date: "",
    academicYear: "2026-27",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...form, id: makeId("cal") });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add calendar event"
      description="Schedule an academic calendar entry."
      className="max-w-lg"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Title" className="sm:col-span-2">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Type">
          <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AcademicCalendarEvent["type"] })}>
            <option value="semester-start">Semester Start</option>
            <option value="semester-end">Semester End</option>
            <option value="examination">Examination</option>
            <option value="internal-exam">Internal Exam</option>
            <option value="assignment">Assignment</option>
            <option value="workshop">Workshop</option>
            <option value="holiday">Holiday</option>
            <option value="event">Event</option>
          </select>
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Academic year" className="sm:col-span-2">
          <Input required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel="Add event" />
      </form>
    </Dialog>
  );
}
