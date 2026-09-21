"use client";

import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";

import { FacultyField } from "@/components/institution/faculty/faculty-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FacultyFormInput } from "@/store/faculty-management-store";
import type { ManagedFaculty } from "@/types/faculty-management";

const EMPTY_FORM: FacultyFormInput = {
  fullName: "",
  designation: "Assistant Professor",
  staffCategory: "teaching",
  department: "Computer Science",
  highestQualification: "M.Tech",
  specialization: "",
  totalExperience: 0,
  email: "",
  phone: "",
  employmentType: "full-time",
  joiningDate: "",
  officeLocation: "",
};

export function FacultyFormDialog({
  faculty,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  faculty: ManagedFaculty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: FacultyFormInput) => void;
  onUpdate: (id: string, patch: Partial<ManagedFaculty>) => void;
}) {
  const [form, setForm] = useState<FacultyFormInput>(() =>
    faculty
      ? {
          fullName: faculty.fullName,
          designation: faculty.designation,
          staffCategory: faculty.staffCategory,
          department: faculty.department,
          highestQualification: faculty.highestQualification,
          specialization: faculty.specialization,
          totalExperience: faculty.totalExperience,
          email: faculty.email,
          phone: faculty.phone,
          employmentType: faculty.employmentType,
          joiningDate: faculty.joiningDate,
          officeLocation: faculty.officeLocation,
        }
      : EMPTY_FORM,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (faculty) onUpdate(faculty.id, form);
    else onCreate(form);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={faculty ? "Edit faculty" : "Add faculty"}
      description="Maintain the faculty employment and academic profile."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <FacultyField label="Full name"><Input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></FacultyField>
        <FacultyField label="Designation"><Input required value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} /></FacultyField>
        <FacultyField label="Staff category">
          <select className="form-control" value={form.staffCategory} onChange={(event) => setForm({ ...form, staffCategory: event.target.value as ManagedFaculty["staffCategory"] })}>
            <option value="teaching">Teaching Faculty</option><option value="non-teaching">Non-Teaching Staff</option>
          </select>
        </FacultyField>
        <FacultyField label="Department"><Input required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></FacultyField>
        <FacultyField label="Highest qualification"><Input required value={form.highestQualification} onChange={(event) => setForm({ ...form, highestQualification: event.target.value })} /></FacultyField>
        <FacultyField label="Specialization"><Input required value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /></FacultyField>
        <FacultyField label="Total experience"><Input required type="number" min="0" value={form.totalExperience} onChange={(event) => setForm({ ...form, totalExperience: Number(event.target.value) })} /></FacultyField>
        <FacultyField label="Employment type">
          <select className="form-control" value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value as ManagedFaculty["employmentType"] })}>
            <option value="full-time">Full Time</option><option value="part-time">Part Time</option><option value="contract">Contract</option><option value="guest">Guest</option>
          </select>
        </FacultyField>
        <FacultyField label="Email"><Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></FacultyField>
        <FacultyField label="Phone"><Input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FacultyField>
        <FacultyField label="Joining date"><Input required type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} /></FacultyField>
        <FacultyField label="Office location"><Input required value={form.officeLocation} onChange={(event) => setForm({ ...form, officeLocation: event.target.value })} /></FacultyField>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">{faculty ? "Save changes" : "Add faculty"}</Button></div>
      </form>
    </Dialog>
  );
}

export type FacultyAssignmentMode = "transfer" | "subject" | "mentor";

export function FacultyAssignmentDialog({
  faculty,
  mode,
  open,
  onOpenChange,
  onTransfer,
  onAssignSubject,
  onAssignMentor,
}: {
  faculty: ManagedFaculty | null;
  mode: FacultyAssignmentMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (id: string, department: string) => void;
  onAssignSubject: (id: string, subject: string, semester: string) => void;
  onAssignMentor: (id: string, students: number) => void;
}) {
  const [primary, setPrimary] = useState(
    mode === "transfer" ? faculty?.department ?? "" : "",
  );
  const [secondary, setSecondary] = useState(
    mode === "subject" ? "Semester 1" : "",
  );

  if (!faculty) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "transfer") onTransfer(faculty.id, primary);
    if (mode === "subject") onAssignSubject(faculty.id, primary, secondary);
    if (mode === "mentor") onAssignMentor(faculty.id, Number(primary));
    onOpenChange(false);
  };

  const title =
    mode === "transfer"
      ? "Transfer department"
      : mode === "subject"
        ? "Assign subject"
        : "Assign mentorship";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={`${faculty.fullName} · ${faculty.id}`}>
      <form className="space-y-4" onSubmit={submit}>
        <FacultyField label={mode === "transfer" ? "New department" : mode === "subject" ? "Subject" : "Students to mentor"}>
          <Input required type={mode === "mentor" ? "number" : "text"} min={mode === "mentor" ? 0 : undefined} value={primary} onChange={(event) => setPrimary(event.target.value)} />
        </FacultyField>
        {mode === "subject" ? <FacultyField label="Semester"><Input required value={secondary} onChange={(event) => setSecondary(event.target.value)} /></FacultyField> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save assignment</Button></div>
      </form>
    </Dialog>
  );
}

export function FacultyNotificationDialog({
  faculty,
  open,
  onOpenChange,
}: {
  faculty: ManagedFaculty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [template, setTemplate] = useState("department-update");
  const [sent, setSent] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Faculty notification" description={faculty ? `Prepare a notification for ${faculty.fullName}.` : "Prepare a faculty notification campaign."}>
      <div className="space-y-4">
        <FacultyField label="Template">
          <select className="form-control" value={template} onChange={(event) => { setTemplate(event.target.value); setSent(false); }}>
            <option value="new-joinee">New Faculty Joined</option><option value="promotion">Promotion</option><option value="transfer">Transfer</option><option value="training">Training Schedule</option><option value="workshop">Workshop Invitation</option><option value="department-update">Department Updates</option>
          </select>
        </FacultyField>
        <Alert variant="info" title="Notification service boundary" description="Template, recipient, and delivery channel are ready for the institution notification API." />
        {sent ? <p role="status" className="text-primary text-sm">Notification prepared successfully.</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" onClick={() => setSent(true)}><Send aria-hidden="true" />Prepare notification</Button></div>
      </div>
    </Dialog>
  );
}
