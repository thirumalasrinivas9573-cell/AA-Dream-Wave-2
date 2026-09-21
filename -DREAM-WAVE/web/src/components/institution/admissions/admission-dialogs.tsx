"use client";

import { Send, Upload } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AdmissionField } from "@/components/institution/admissions/admissions-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  AdmissionApplication,
  AdmissionInterview,
  AdmissionNotificationTemplate,
} from "@/types/admissions";

const DEPARTMENTS = [
  "Computer Science",
  "Business Administration",
  "Design Studies",
] as const;

const COURSES = [
  "B.Tech Computer Science",
  "MBA Digital Leadership",
  "UX Design Diploma",
  "Data Science Certificate",
] as const;

const OFFICERS = ["Priya Menon", "Rohan Desai", "Sameer Khan"] as const;

type NewAdmissionInput = Pick<
  AdmissionApplication,
  | "fullName"
  | "email"
  | "phone"
  | "gender"
  | "dateOfBirth"
  | "department"
  | "course"
  | "qualification"
  | "city"
  | "state"
  | "assignedOfficer"
>;

const EMPTY_ADMISSION: NewAdmissionInput = {
  fullName: "",
  email: "",
  phone: "",
  gender: "prefer-not-to-say",
  dateOfBirth: "",
  department: DEPARTMENTS[0],
  course: COURSES[0],
  qualification: "12th",
  city: "",
  state: "",
  assignedOfficer: OFFICERS[0],
};

export function NewAdmissionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: NewAdmissionInput) => void;
}) {
  const [form, setForm] = useState<NewAdmissionInput>(EMPTY_ADMISSION);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate(form);
    setForm(EMPTY_ADMISSION);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New admission"
      description="Create an applicant record for the current admission cycle."
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <AdmissionField label="Full name">
          <Input
            required
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            autoComplete="name"
          />
        </AdmissionField>
        <AdmissionField label="Email">
          <Input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
          />
        </AdmissionField>
        <AdmissionField label="Phone">
          <Input
            required
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            autoComplete="tel"
          />
        </AdmissionField>
        <AdmissionField label="Date of birth">
          <Input
            required
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
          />
        </AdmissionField>
        <AdmissionField label="Gender">
          <select
            required
            className="form-control"
            value={form.gender}
            onChange={(event) =>
              setForm({
                ...form,
                gender: event.target.value as NewAdmissionInput["gender"],
              })
            }
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </AdmissionField>
        <AdmissionField label="Qualification">
          <select
            required
            className="form-control"
            value={form.qualification}
            onChange={(event) =>
              setForm({ ...form, qualification: event.target.value })
            }
          >
            <option value="10th">10th</option>
            <option value="12th">12th</option>
            <option value="diploma">Diploma</option>
            <option value="degree">Degree</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
        </AdmissionField>
        <AdmissionField label="Department">
          <select
            required
            className="form-control"
            value={form.department}
            onChange={(event) => setForm({ ...form, department: event.target.value })}
          >
            {DEPARTMENTS.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </select>
        </AdmissionField>
        <AdmissionField label="Course">
          <select
            required
            className="form-control"
            value={form.course}
            onChange={(event) => setForm({ ...form, course: event.target.value })}
          >
            {COURSES.map((course) => (
              <option key={course}>{course}</option>
            ))}
          </select>
        </AdmissionField>
        <AdmissionField label="City">
          <Input
            required
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            autoComplete="address-level2"
          />
        </AdmissionField>
        <AdmissionField label="State">
          <Input
            required
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.target.value })}
            autoComplete="address-level1"
          />
        </AdmissionField>
        <AdmissionField label="Assigned officer" className="sm:col-span-2">
          <select
            required
            className="form-control"
            value={form.assignedOfficer}
            onChange={(event) =>
              setForm({ ...form, assignedOfficer: event.target.value })
            }
          >
            {OFFICERS.map((officer) => (
              <option key={officer}>{officer}</option>
            ))}
          </select>
        </AdmissionField>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Create application</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ImportApplicationsDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (applications: NewAdmissionInput[]) => number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const importFile = async () => {
    if (!file) return;
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));
    const applications: NewAdmissionInput[] = rows
      .filter((row) => row.length >= 7 && row[0] && row[1])
      .map((row) => ({
        fullName: row[0]!,
        email: row[1]!,
        phone: row[2] ?? "",
        gender: "prefer-not-to-say",
        dateOfBirth: "",
        department: row[3] || DEPARTMENTS[0],
        course: row[4] || COURSES[0],
        qualification: row[5] || "12th",
        city: row[6] || "",
        state: row[7] || "",
        assignedOfficer: row[8] || OFFICERS[0],
      }));
    const count = onImport(applications);
    setMessage(`${count} application${count === 1 ? "" : "s"} imported.`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import applications"
      description="Upload an Excel-compatible CSV file using the admissions template."
    >
      <div className="space-y-4">
        <Alert
          variant="info"
          title="CSV and Excel workflow"
          description="Export Excel sheets as CSV with columns: name, email, phone, department, course, qualification, city, state, officer."
        />
        <AdmissionField label="Application file">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setMessage(null);
            }}
          />
        </AdmissionField>
        {message ? (
          <p className="text-primary text-sm" role="status">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!file} onClick={importFile}>
            <Upload aria-hidden="true" />
            Import file
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function InterviewSchedulerDialog({
  application,
  open,
  onOpenChange,
  onSave,
}: {
  application: AdmissionApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, interview: AdmissionInterview) => void;
}) {
  const [form, setForm] = useState<AdmissionInterview>(() => ({
    ...(application?.interview ?? {
      status: "not-scheduled",
      panel: [],
      remarks: "",
    }),
      status: "scheduled",
    mode: application?.interview.mode ?? "online",
    date: application?.interview.date ?? "",
    time: application?.interview.time ?? "",
    meetingLink: application?.interview.meetingLink ?? "",
    location: application?.interview.location ?? "",
  }));
  const [panelText, setPanelText] = useState(() =>
    application?.interview.panel.join(", ") ?? "",
  );

  if (!application) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(application.id, {
      ...form,
      status: "scheduled",
      panel: panelText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  };

  const cancelInterview = () => {
    onSave(application.id, {
      ...form,
      status: "cancelled",
      panel: panelText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        application.interview.status === "scheduled"
          ? "Reschedule interview"
          : "Schedule interview"
      }
      description={`${application.fullName} · ${application.id}`}
      className="max-w-xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <AdmissionField label="Interview date">
          <Input
            required
            type="date"
            value={form.date ?? ""}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </AdmissionField>
        <AdmissionField label="Interview time">
          <Input
            required
            type="time"
            value={form.time ?? ""}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
        </AdmissionField>
        <AdmissionField label="Interview mode">
          <select
            className="form-control"
            value={form.mode}
            onChange={(event) =>
              setForm({
                ...form,
                mode: event.target.value as NonNullable<
                  AdmissionInterview["mode"]
                >,
              })
            }
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </AdmissionField>
        <AdmissionField label="Interview panel">
          <Input
            required
            value={panelText}
            onChange={(event) => setPanelText(event.target.value)}
            placeholder="Names separated by commas"
          />
        </AdmissionField>
        {form.mode === "online" ? (
          <AdmissionField label="Meeting link" className="sm:col-span-2">
            <Input
              required
              type="url"
              value={form.meetingLink ?? ""}
              onChange={(event) =>
                setForm({ ...form, meetingLink: event.target.value })
              }
              placeholder="https://"
            />
          </AdmissionField>
        ) : (
          <AdmissionField label="Interview location" className="sm:col-span-2">
            <Input
              required
              value={form.location ?? ""}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </AdmissionField>
        )}
        <AdmissionField label="Remarks" className="sm:col-span-2">
          <Input
            value={form.remarks}
            onChange={(event) => setForm({ ...form, remarks: event.target.value })}
          />
        </AdmissionField>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={application.interview.status !== "scheduled"}
            onClick={cancelInterview}
          >
            Cancel interview
          </Button>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit">Save interview</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

const NOTIFICATION_TEMPLATES: Array<{
  value: AdmissionNotificationTemplate;
  label: string;
}> = [
  { value: "application-received", label: "Application Received" },
  { value: "document-required", label: "Document Required" },
  { value: "interview-invitation", label: "Interview Invitation" },
  { value: "application-approved", label: "Application Approved" },
  { value: "application-rejected", label: "Application Rejected" },
  { value: "enrollment-confirmation", label: "Enrollment Confirmation" },
];

export function AdmissionNotificationDialog({
  open,
  onOpenChange,
  recipientCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientCount: number;
}) {
  const [template, setTemplate] =
    useState<AdmissionNotificationTemplate>("application-received");
  const [channel, setChannel] = useState("email");
  const [sent, setSent] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send admission notification"
      description="Prepare a backend-ready notification campaign."
    >
      <div className="space-y-4">
        <AdmissionField label="Notification template">
          <select
            className="form-control"
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value as AdmissionNotificationTemplate);
              setSent(false);
            }}
          >
            {NOTIFICATION_TEMPLATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdmissionField>
        <AdmissionField label="Delivery channel">
          <select
            className="form-control"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Email and SMS</option>
          </select>
        </AdmissionField>
        <Alert
          variant="info"
          title={`${recipientCount} selected recipients`}
          description="The production notification API can consume the selected template, channel, and filtered application IDs."
        />
        {sent ? (
          <p className="text-primary text-sm" role="status">
            Notification campaign prepared successfully.
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
