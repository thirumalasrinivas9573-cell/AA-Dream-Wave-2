"use client";

import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AcademicField } from "@/components/institution/academics/academic-ui";
import {
  APPLICATION_STAGE_OPTIONS,
  LISTING_STATUS_OPTIONS,
  PLACEMENT_STATUS_OPTIONS,
} from "@/components/institution/placements/placement-ui";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApplicationStage,
  DriveMode,
  Internship,
  Interview,
  Job,
  JobType,
  ListingStatus,
  Offer,
  OfferStatus,
  PlacementApplication,
  PlacementDrive,
  PlacementStatus,
  Recruiter,
  WorkMode,
} from "@/types/placement-management";

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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

export function RecruiterDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: Recruiter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Recruiter) => void;
}) {
  const [form, setForm] = useState<Recruiter>(
    () =>
      record ?? {
        id: makeId("rec"),
        logoInitials: "",
        name: "",
        industry: "",
        hrContact: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        about: "",
        hiringDepartments: [],
        requiredSkills: [],
        hiringProcess: [],
        pastPlacements: 0,
        internshipsCount: 0,
        jobsCount: 0,
        driveStatus: "upcoming",
        status: "active",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      logoInitials: form.logoInitials || form.name.slice(0, 2).toUpperCase(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit recruiter" : "Add recruiter"}
      description="Maintain the company recruiter profile and hiring details."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Company name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Industry">
          <Input required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </AcademicField>
        <AcademicField label="HR contact">
          <Input required value={form.hrContact} onChange={(e) => setForm({ ...form, hrContact: e.target.value })} />
        </AcademicField>
        <AcademicField label="Email">
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </AcademicField>
        <AcademicField label="Phone">
          <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </AcademicField>
        <AcademicField label="Location">
          <Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </AcademicField>
        <AcademicField label="Website">
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </AcademicField>
        <AcademicField label="Campus drive status">
          <select className="form-control" value={form.driveStatus} onChange={(e) => setForm({ ...form, driveStatus: e.target.value as PlacementStatus })}>
            {PLACEMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </AcademicField>
        <AcademicField label="Hiring departments (comma separated)" className="sm:col-span-2">
          <Input value={form.hiringDepartments.join(", ")} onChange={(e) => setForm({ ...form, hiringDepartments: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Required skills (comma separated)" className="sm:col-span-2">
          <Input value={form.requiredSkills.join(", ")} onChange={(e) => setForm({ ...form, requiredSkills: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Hiring process (comma separated)" className="sm:col-span-2">
          <Input value={form.hiringProcess.join(", ")} onChange={(e) => setForm({ ...form, hiringProcess: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="About" className="sm:col-span-2">
          <Textarea rows={2} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add recruiter"} />
      </form>
    </Dialog>
  );
}

export function DriveDialog({
  record,
  recruiters,
  open,
  onOpenChange,
  onSave,
}: {
  record: PlacementDrive | null;
  recruiters: Recruiter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: PlacementDrive) => void;
}) {
  const [form, setForm] = useState<PlacementDrive>(
    () =>
      record ?? {
        id: makeId("drv"),
        name: "",
        companyId: recruiters[0]?.id ?? "",
        date: "",
        venue: "",
        mode: "online",
        eligibleDepartments: [],
        eligiblePrograms: [],
        minCgpa: 6,
        maxBacklogs: 0,
        skillsRequired: [],
        registrationDeadline: "",
        status: "upcoming",
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
      title={record ? "Edit drive" : "Add placement drive"}
      description="Configure the recruitment drive, eligibility, and schedule."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Drive name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Company">
          <select className="form-control" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Mode">
          <select className="form-control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as DriveMode })}>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </AcademicField>
        <AcademicField label="Venue">
          <Input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </AcademicField>
        <AcademicField label="Registration deadline">
          <Input required type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
        </AcademicField>
        <AcademicField label="Minimum CGPA">
          <Input required type="number" step="0.1" min="0" max="10" value={form.minCgpa} onChange={(e) => setForm({ ...form, minCgpa: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Maximum backlogs">
          <Input required type="number" min="0" value={form.maxBacklogs} onChange={(e) => setForm({ ...form, maxBacklogs: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Eligible departments (comma separated)" className="sm:col-span-2">
          <Input value={form.eligibleDepartments.join(", ")} onChange={(e) => setForm({ ...form, eligibleDepartments: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Eligible programs (comma separated)" className="sm:col-span-2">
          <Input value={form.eligiblePrograms.join(", ")} onChange={(e) => setForm({ ...form, eligiblePrograms: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Skills required (comma separated)" className="sm:col-span-2">
          <Input value={form.skillsRequired.join(", ")} onChange={(e) => setForm({ ...form, skillsRequired: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlacementStatus })}>
            {PLACEMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add drive"} />
      </form>
    </Dialog>
  );
}

export function InternshipDialog({
  record,
  recruiters,
  open,
  onOpenChange,
  onSave,
}: {
  record: Internship | null;
  recruiters: Recruiter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Internship) => void;
}) {
  const [form, setForm] = useState<Internship>(
    () =>
      record ?? {
        id: makeId("int"),
        title: "",
        companyId: recruiters[0]?.id ?? "",
        duration: "",
        location: "",
        workMode: "office",
        stipend: 0,
        eligibility: "",
        requiredSkills: [],
        deadline: "",
        openPositions: 1,
        status: "open",
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
      title={record ? "Edit internship" : "Add internship"}
      description="Configure the internship listing and eligibility."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Internship title">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Company">
          <select className="form-control" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Duration">
          <Input required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 6 months" />
        </AcademicField>
        <AcademicField label="Location">
          <Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </AcademicField>
        <AcademicField label="Work mode">
          <select className="form-control" value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value as WorkMode })}>
            <option value="office">Office</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </AcademicField>
        <AcademicField label="Stipend (₹/month)">
          <Input required type="number" min="0" value={form.stipend} onChange={(e) => setForm({ ...form, stipend: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Open positions">
          <Input required type="number" min="0" value={form.openPositions} onChange={(e) => setForm({ ...form, openPositions: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Deadline">
          <Input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </AcademicField>
        <AcademicField label="Eligibility" className="sm:col-span-2">
          <Input required value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
        </AcademicField>
        <AcademicField label="Required skills (comma separated)" className="sm:col-span-2">
          <Input value={form.requiredSkills.join(", ")} onChange={(e) => setForm({ ...form, requiredSkills: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ListingStatus })}>
            {LISTING_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add internship"} />
      </form>
    </Dialog>
  );
}

export function JobDialog({
  record,
  recruiters,
  open,
  onOpenChange,
  onSave,
}: {
  record: Job | null;
  recruiters: Recruiter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Job) => void;
}) {
  const [form, setForm] = useState<Job>(
    () =>
      record ?? {
        id: makeId("job"),
        title: "",
        companyId: recruiters[0]?.id ?? "",
        salary: 0,
        location: "",
        experience: "0-1 years",
        eligibility: "",
        jobType: "full-time",
        deadline: "",
        selectionProcess: [],
        status: "open",
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
      title={record ? "Edit job" : "Add job"}
      description="Configure the job opportunity and selection process."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Job title">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Company">
          <select className="form-control" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Salary (₹/year)">
          <Input required type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Location">
          <Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </AcademicField>
        <AcademicField label="Experience">
          <Input required value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
        </AcademicField>
        <AcademicField label="Job type">
          <select className="form-control" value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value as JobType })}>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </AcademicField>
        <AcademicField label="Application deadline">
          <Input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ListingStatus })}>
            {LISTING_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Eligibility" className="sm:col-span-2">
          <Input required value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
        </AcademicField>
        <AcademicField label="Selection process (comma separated)" className="sm:col-span-2">
          <Input value={form.selectionProcess.join(", ")} onChange={(e) => setForm({ ...form, selectionProcess: splitList(e.target.value) })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add job"} />
      </form>
    </Dialog>
  );
}

export function InterviewDialog({
  record,
  recruiters,
  open,
  onOpenChange,
  onSave,
}: {
  record: Interview | null;
  recruiters: Recruiter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Interview) => void;
}) {
  const [form, setForm] = useState<Interview>(
    () =>
      record ?? {
        id: makeId("iv"),
        studentName: "",
        companyId: recruiters[0]?.id ?? "",
        role: "",
        date: "",
        time: "",
        panel: "",
        meetingLink: "",
        venue: "",
        status: "scheduled",
        feedback: "",
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
      title={record ? "Edit interview" : "Schedule interview"}
      description="Set the interview schedule, panel, and mode."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Student name">
          <Input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
        </AcademicField>
        <AcademicField label="Company">
          <select className="form-control" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Role">
          <Input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </AcademicField>
        <AcademicField label="Interview panel">
          <Input required value={form.panel} onChange={(e) => setForm({ ...form, panel: e.target.value })} />
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Time">
          <Input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </AcademicField>
        <AcademicField label="Meeting link">
          <Input value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} />
        </AcademicField>
        <AcademicField label="Offline venue">
          <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Interview["status"] })}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </AcademicField>
        <AcademicField label="Feedback" className="sm:col-span-2">
          <Textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Schedule interview"} />
      </form>
    </Dialog>
  );
}

export function OfferDialog({
  record,
  recruiters,
  open,
  onOpenChange,
  onSave,
}: {
  record: Offer | null;
  recruiters: Recruiter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Offer) => void;
}) {
  const [form, setForm] = useState<Offer>(
    () =>
      record ?? {
        id: makeId("off"),
        studentName: "",
        companyId: recruiters[0]?.id ?? "",
        role: "",
        department: "",
        salary: 0,
        joiningDate: "",
        location: "",
        status: "released",
        expiryDate: "",
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
      title={record ? "Edit offer" : "Release offer"}
      description="Manage the offer letter details and acceptance status."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Student name">
          <Input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
        </AcademicField>
        <AcademicField label="Company">
          <select className="form-control" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Role">
          <Input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </AcademicField>
        <AcademicField label="Department">
          <Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </AcademicField>
        <AcademicField label="Salary (₹/year)">
          <Input required type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Location">
          <Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </AcademicField>
        <AcademicField label="Joining date">
          <Input required type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        </AcademicField>
        <AcademicField label="Offer expiry">
          <Input required type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
        </AcademicField>
        <AcademicField label="Acceptance status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OfferStatus })}>
            <option value="released">Released</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Release offer"} />
      </form>
    </Dialog>
  );
}

export function ApplicationStageDialog({
  application,
  open,
  onOpenChange,
  onSave,
}: {
  application: PlacementApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, stage: ApplicationStage) => void;
}) {
  const [stage, setStage] = useState<ApplicationStage>(
    application?.stage ?? "applied",
  );

  if (!application) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(application.id, stage);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Update application stage"
      description={`${application.studentName} · ${application.role}`}
    >
      <form className="space-y-4" onSubmit={submit}>
        <AcademicField label="Stage">
          <select className="form-control" value={stage} onChange={(e) => setStage(e.target.value as ApplicationStage)}>
            {APPLICATION_STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </AcademicField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit">Update stage</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function PlacementNotificationDialog({
  open,
  onOpenChange,
  onSend,
  driveId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (payload: { template: string; title: string; body: string; driveId?: string }) => Promise<void>;
  driveId?: string;
}) {
  const [template, setTemplate] = useState("opportunity_published");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const templateMap: Record<string, string> = {
    "drive-announced": "opportunity_published",
    "new-internship": "opportunity_published",
    "interview-scheduled": "interview_scheduled",
    "offer-released": "offer_released",
    "registration-closing": "registration_deadline_reminder",
    "company-visit": "opportunity_published",
  };

  const handleSend = async () => {
    if (!onSend) {
      setSent(true);
      return;
    }
    setSending(true);
    try {
      await onSend({
        template: templateMap[template] || "opportunity_published",
        title: title || template.replace(/-/g, " "),
        body: body || title || template.replace(/-/g, " "),
        ...(driveId ? { driveId } : {}),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Placement notification"
      description="Send placement communications to registered students."
    >
      <div className="space-y-4">
        <AcademicField label="Template">
          <select className="form-control" value={template} onChange={(e) => { setTemplate(e.target.value); setSent(false); }}>
            <option value="drive-announced">Placement Drive Announced</option>
            <option value="new-internship">New Internship</option>
            <option value="interview-scheduled">Interview Scheduled</option>
            <option value="offer-released">Offer Released</option>
            <option value="registration-closing">Registration Closing</option>
            <option value="company-visit">Company Visit</option>
          </select>
        </AcademicField>
        <AcademicField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </AcademicField>
        <AcademicField label="Message">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body" />
        </AcademicField>
        {sent ? <p role="status" className="text-primary text-sm">Notification sent successfully.</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={sending} onClick={() => void handleSend()}><Send aria-hidden="true" />{sending ? "Sending…" : "Send notification"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
