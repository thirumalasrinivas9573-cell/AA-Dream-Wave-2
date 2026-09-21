"use client";

import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AcademicField } from "@/components/institution/academics/academic-ui";
import {
  ANNOUNCEMENT_CATEGORY_OPTIONS,
  ANNOUNCEMENT_STATUS_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  EVENT_STATUS_OPTIONS,
  NEWS_TYPE_OPTIONS,
} from "@/components/institution/campus/campus-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  CampusEvent,
  CampusNews,
  ClubCategory,
  EventCategory,
  EventMode,
  EventStatus,
  GalleryAlbum,
  GalleryCategory,
  NewsType,
  StudentClub,
} from "@/types/campus-management";

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

const splitList = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

function DialogActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 sm:col-span-2">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}

export function AnnouncementDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: Announcement) => void;
}) {
  const [form, setForm] = useState<Announcement>(
    () =>
      record ?? {
        id: makeId("ann"),
        title: "",
        body: "",
        category: "general",
        priority: "medium",
        audience: "students",
        pinned: false,
        publishAt: "",
        expiryAt: "",
        status: "published",
        attachments: [],
        views: 0,
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
      title={record ? "Edit announcement" : "Create announcement"}
      description="Publish a targeted announcement with priority and scheduling."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Title" className="sm:col-span-2">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Category">
          <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AnnouncementCategory })}>
            {ANNOUNCEMENT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Priority">
          <select className="form-control" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </AcademicField>
        <AcademicField label="Target audience">
          <select className="form-control" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}>
            <option value="students">Students</option>
            <option value="faculty">Faculty</option>
            <option value="departments">Departments</option>
            <option value="institution">Entire Institution</option>
          </select>
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AnnouncementStatus })}>
            {ANNOUNCEMENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Publish date">
          <Input required type="date" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} />
        </AcademicField>
        <AcademicField label="Expiry date">
          <Input required type="date" value={form.expiryAt} onChange={(e) => setForm({ ...form, expiryAt: e.target.value })} />
        </AcademicField>
        <AcademicField label="Body" className="sm:col-span-2">
          <Textarea rows={3} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </AcademicField>
        <AcademicField label="Attachments (comma separated file names)" className="sm:col-span-2">
          <Input value={form.attachments.join(", ")} onChange={(e) => setForm({ ...form, attachments: splitList(e.target.value) })} placeholder="images, PDF, documents" />
        </AcademicField>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input type="checkbox" className="size-4 rounded border-input" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
          Pin announcement
        </label>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Create announcement"} />
      </form>
    </Dialog>
  );
}

export function EventDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: CampusEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: CampusEvent) => void;
}) {
  const [form, setForm] = useState<CampusEvent>(
    () =>
      record ?? {
        id: makeId("evt"),
        title: "",
        description: "",
        category: "workshop",
        bannerInitials: "",
        date: "",
        time: "",
        venue: "",
        mode: "offline",
        capacity: 100,
        registered: 0,
        registrationDeadline: "",
        organizer: "",
        department: "",
        guestSpeakers: [],
        agenda: [],
        status: "upcoming",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      bannerInitials: form.bannerInitials || form.title.slice(0, 2).toUpperCase(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit event" : "Create event"}
      description="Configure the campus event details, schedule, and agenda."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Title" className="sm:col-span-2">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Category">
          <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })}>
            {EVENT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Mode">
          <select className="form-control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as EventMode })}>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Time">
          <Input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </AcademicField>
        <AcademicField label="Venue">
          <Input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </AcademicField>
        <AcademicField label="Organizer">
          <Input required value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
        </AcademicField>
        <AcademicField label="Department">
          <Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </AcademicField>
        <AcademicField label="Capacity">
          <Input required type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Registration deadline">
          <Input required type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
            {EVENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </AcademicField>
        <AcademicField label="Guest speakers (comma separated)" className="sm:col-span-2">
          <Input value={form.guestSpeakers.join(", ")} onChange={(e) => setForm({ ...form, guestSpeakers: splitList(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Agenda (comma separated)" className="sm:col-span-2">
          <Input value={form.agenda.join(", ")} onChange={(e) => setForm({ ...form, agenda: splitList(e.target.value) })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Create event"} />
      </form>
    </Dialog>
  );
}

export function ClubDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: StudentClub | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: StudentClub) => void;
}) {
  const [form, setForm] = useState<StudentClub>(
    () =>
      record ?? {
        id: makeId("club"),
        name: "",
        category: "technical",
        logoInitials: "",
        coordinator: "",
        president: "",
        members: 0,
        upcomingActivities: [],
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
      title={record ? "Edit club" : "Add club"}
      description="Manage the student club, coordinator, and activities."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Club name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AcademicField>
        <AcademicField label="Category">
          <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ClubCategory })}>
            <option value="technical">Technical</option>
            <option value="coding">Coding</option>
            <option value="ai">AI</option>
            <option value="robotics">Robotics</option>
            <option value="cultural">Cultural</option>
            <option value="music">Music</option>
            <option value="dance">Dance</option>
            <option value="sports">Sports</option>
            <option value="photography">Photography</option>
            <option value="entrepreneurship">Entrepreneurship</option>
          </select>
        </AcademicField>
        <AcademicField label="Faculty coordinator">
          <Input required value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} />
        </AcademicField>
        <AcademicField label="President">
          <Input required value={form.president} onChange={(e) => setForm({ ...form, president: e.target.value })} />
        </AcademicField>
        <AcademicField label="Members">
          <Input required type="number" min="0" value={form.members} onChange={(e) => setForm({ ...form, members: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Status">
          <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StudentClub["status"] })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </AcademicField>
        <AcademicField label="Upcoming activities (comma separated)" className="sm:col-span-2">
          <Input value={form.upcomingActivities.join(", ")} onChange={(e) => setForm({ ...form, upcomingActivities: splitList(e.target.value) })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add club"} />
      </form>
    </Dialog>
  );
}

export function AlbumDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: GalleryAlbum | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: GalleryAlbum) => void;
}) {
  const [form, setForm] = useState<GalleryAlbum>(
    () =>
      record ?? {
        id: makeId("alb"),
        title: "",
        category: "event",
        coverInitials: "",
        photos: 0,
        videos: 0,
        date: "",
        description: "",
      },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      coverInitials: form.coverInitials || form.title.slice(0, 2).toUpperCase(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit album" : "Create album"}
      description="Organize campus media into an album."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Album title" className="sm:col-span-2">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Category">
          <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GalleryCategory })}>
            <option value="event">Event Memories</option>
            <option value="convocation">Convocation</option>
            <option value="sports">Sports</option>
            <option value="festivals">Festivals</option>
            <option value="placements">Placements</option>
            <option value="workshops">Workshops</option>
            <option value="achievements">Achievements</option>
          </select>
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Photos">
          <Input required type="number" min="0" value={form.photos} onChange={(e) => setForm({ ...form, photos: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Videos">
          <Input required type="number" min="0" value={form.videos} onChange={(e) => setForm({ ...form, videos: Number(e.target.value) })} />
        </AcademicField>
        <AcademicField label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Create album"} />
      </form>
    </Dialog>
  );
}

export function NewsDialog({
  record,
  open,
  onOpenChange,
  onSave,
}: {
  record: CampusNews | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: CampusNews) => void;
}) {
  const [form, setForm] = useState<CampusNews>(
    () =>
      record ?? {
        id: makeId("news"),
        title: "",
        type: "news",
        summary: "",
        date: "",
        department: "",
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
      title={record ? "Edit news" : "Add news / achievement"}
      description="Publish institution news, achievements, and highlights."
      className="max-w-2xl"
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <AcademicField label="Title" className="sm:col-span-2">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </AcademicField>
        <AcademicField label="Type">
          <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NewsType })}>
            {NEWS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </AcademicField>
        <AcademicField label="Department">
          <Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </AcademicField>
        <AcademicField label="Date">
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </AcademicField>
        <AcademicField label="Summary" className="sm:col-span-2">
          <Textarea rows={2} required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </AcademicField>
        <DialogActions onCancel={() => onOpenChange(false)} submitLabel={record ? "Save changes" : "Add news"} />
      </form>
    </Dialog>
  );
}

export function CampusNotificationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [template, setTemplate] = useState("live-announcement");
  const [sent, setSent] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Campus communication"
      description="Broadcast a campus notification across channels."
    >
      <div className="space-y-4">
        <AcademicField label="Channel / template">
          <select className="form-control" value={template} onChange={(e) => { setTemplate(e.target.value); setSent(false); }}>
            <option value="live-announcement">Live Announcement</option>
            <option value="push">Push Notification</option>
            <option value="in-app">In-App Notification</option>
            <option value="email">Email Notification</option>
            <option value="department">Department Specific Notice</option>
            <option value="emergency">Emergency Alert</option>
          </select>
        </AcademicField>
        <Alert
          variant="info"
          title="Real-time communication boundary"
          description="Live, push, in-app, email, and emergency channels are ready for the campus communication API and student portal delivery."
        />
        {sent ? <p role="status" className="text-primary text-sm">Notification prepared successfully.</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={() => setSent(true)}><Send aria-hidden="true" />Broadcast</Button>
        </div>
      </div>
    </Dialog>
  );
}
