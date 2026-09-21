"use client";

import { Send, Upload } from "lucide-react";
import { type FormEvent, useState } from "react";

import {
  STUDENT_STATUS_OPTIONS,
  StudentField,
} from "@/components/institution/students/student-management-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ManagedStudent } from "@/types/student-management";

export function EditStudentDialog({
  student,
  open,
  onOpenChange,
  onSave,
}: {
  student: ManagedStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<ManagedStudent>) => void;
}) {
  const [form, setForm] = useState(() => ({
    fullName: student?.fullName ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    semester: student?.semester ?? "",
    section: student?.section ?? "",
    academicYear: student?.academicYear ?? "",
    status: student?.status ?? ("active" as const),
  }));

  if (!student) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(student.id, form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit student"
      description={`${student.id} · ${student.rollNumber}`}
      className="max-w-xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <StudentField label="Full name" className="sm:col-span-2">
          <Input
            required
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          />
        </StudentField>
        <StudentField label="Email">
          <Input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </StudentField>
        <StudentField label="Phone">
          <Input
            required
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </StudentField>
        <StudentField label="Semester">
          <Input
            required
            value={form.semester}
            onChange={(event) => setForm({ ...form, semester: event.target.value })}
          />
        </StudentField>
        <StudentField label="Section">
          <Input
            required
            value={form.section}
            onChange={(event) => setForm({ ...form, section: event.target.value })}
          />
        </StudentField>
        <StudentField label="Academic year">
          <Input
            required
            value={form.academicYear}
            onChange={(event) =>
              setForm({ ...form, academicYear: event.target.value })
            }
          />
        </StudentField>
        <StudentField label="Status">
          <select
            className="form-control"
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as ManagedStudent["status"],
              })
            }
          >
            {STUDENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </StudentField>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function TransferStudentDialog({
  student,
  open,
  onOpenChange,
  onTransfer,
}: {
  student: ManagedStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (
    id: string,
    department: string,
    course: string,
    section: string,
  ) => void;
}) {
  const [department, setDepartment] = useState(student?.department ?? "");
  const [course, setCourse] = useState(student?.course ?? "");
  const [section, setSection] = useState(student?.section ?? "");

  if (!student) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onTransfer(student.id, department, course, section);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer student"
      description={`Move ${student.fullName} to another academic assignment.`}
    >
      <form className="space-y-4" onSubmit={submit}>
        <StudentField label="Department">
          <Input
            required
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
        </StudentField>
        <StudentField label="Course">
          <Input
            required
            value={course}
            onChange={(event) => setCourse(event.target.value)}
          />
        </StudentField>
        <StudentField label="Section">
          <Input
            required
            value={section}
            onChange={(event) => setSection(event.target.value)}
          />
        </StudentField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Transfer student</Button>
        </div>
      </form>
    </Dialog>
  );
}

type StudentImportRow = Pick<
  ManagedStudent,
  | "fullName"
  | "email"
  | "phone"
  | "department"
  | "course"
  | "semester"
  | "section"
  | "gender"
>;

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: StudentImportRow[]) => number | Promise<number>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runImport = async () => {
    if (!file) return;
    const lines = (await file.text())
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1);
    const rows: StudentImportRow[] = lines
      .map((line) => line.split(",").map((value) => value.trim()))
      .filter((row) => row[0] && row[1])
      .map((row) => ({
        fullName: row[0]!,
        email: row[1]!,
        phone: row[2] ?? "",
        department: row[3] ?? "",
        course: row[4] ?? "",
        semester: row[5] || "Semester 1",
        section: row[6] || "A",
        gender: "prefer-not-to-say",
      }));
    const count = await Promise.resolve(onImport(rows));
    setMessage(`${count} student${count === 1 ? "" : "s"} imported.`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import students"
      description="Bulk upload student records from Excel-compatible CSV files."
    >
      <div className="space-y-4">
        <Alert
          variant="info"
          title="Bulk upload format"
          description="Columns: name, email, phone, department, course, semester, section."
        />
        <StudentField label="Excel or CSV file">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setMessage(null);
            }}
          />
        </StudentField>
        {message ? (
          <p role="status" className="text-primary text-sm">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!file} onClick={runImport}>
            <Upload aria-hidden="true" />
            Bulk upload
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function StudentNotificationDialog({
  student,
  open,
  onOpenChange,
}: {
  student: ManagedStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [template, setTemplate] = useState("academic-update");
  const [sent, setSent] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send student notification"
      description={
        student
          ? `Prepare a notification for ${student.fullName}.`
          : "Prepare a notification for the filtered student list."
      }
    >
      <div className="space-y-4">
        <StudentField label="Template">
          <select
            className="form-control"
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value);
              setSent(false);
            }}
          >
            <option value="academic-update">Academic Update</option>
            <option value="attendance-alert">Attendance Alert</option>
            <option value="document-required">Document Required</option>
            <option value="placement-opportunity">Placement Opportunity</option>
            <option value="semester-promotion">Semester Promotion</option>
          </select>
        </StudentField>
        <Alert
          variant="info"
          title="Notification service boundary"
          description="The selected student IDs, template, and delivery channel are ready for the institution notification API."
        />
        {sent ? (
          <p role="status" className="text-primary text-sm">
            Notification prepared successfully.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setSent(true)}>
            <Send aria-hidden="true" />
            Prepare notification
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
