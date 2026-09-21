"use client";

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  MessageSquareText,
} from "lucide-react";
import { useState } from "react";

import {
  ADMISSION_STATUS_OPTIONS,
  AdmissionStatusBadge,
  DetailItem,
} from "@/components/institution/admissions/admissions-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AdmissionApplication,
  AdmissionStatus,
} from "@/types/admissions";

const DETAIL_TABS = [
  "overview",
  "personal",
  "academic",
  "guardian",
  "documents",
  "interview",
  "timeline",
  "remarks",
] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-3 text-base font-semibold tracking-tight">{children}</h3>;
}

export function ApplicationDetailsDrawer({
  application,
  open,
  onOpenChange,
  onStatusChange,
  onScheduleInterview,
  onAddRemark,
}: {
  application: AdmissionApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: AdmissionStatus) => void;
  onScheduleInterview: (application: AdmissionApplication) => void;
  onAddRemark: (id: string, text: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [remark, setRemark] = useState("");

  if (!application) return null;

  const submitRemark = () => {
    const text = remark.trim();
    if (!text) return;
    onAddRemark(application.id, text);
    setRemark("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={application.fullName}
      description={`${application.id} · ${application.course}`}
      className="sm:fixed sm:inset-y-0 sm:right-0 sm:max-h-svh sm:max-w-4xl sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6"
    >
      <div className="space-y-5">
        <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl font-semibold">
              {application.photoInitials}
            </span>
            <div>
              <AdmissionStatusBadge status={application.status} />
              <p className="text-muted-foreground mt-1 text-xs">
                Assigned to {application.assignedOfficer}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="application-status">Application status</Label>
              <select
                id="application-status"
                className="form-control min-w-48"
                value={application.status}
                onChange={(event) =>
                  onStatusChange(
                    application.id,
                    event.target.value as AdmissionStatus,
                  )
                }
              >
                {ADMISSION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => onScheduleInterview(application)}
            >
              <CalendarClock aria-hidden="true" />
              {application.interview.status === "scheduled"
                ? "Reschedule"
                : "Schedule interview"}
            </Button>
          </div>
        </div>

        <div className="scroll-region overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Application details">
            {DETAIL_TABS.map((item) => (
              <Button
                key={item}
                type="button"
                role="tab"
                size="sm"
                variant={tab === item ? "default" : "ghost"}
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className="capitalize"
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div role="tabpanel" className="min-h-80">
          {tab === "overview" ? (
            <div className="space-y-5">
              <section>
                <SectionTitle>Application overview</SectionTitle>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem label="Application ID" value={application.id} />
                  <DetailItem label="Department" value={application.department} />
                  <DetailItem label="Course" value={application.course} />
                  <DetailItem label="Qualification" value={application.qualification} />
                  <DetailItem
                    label="Application date"
                    value={new Date(
                      `${application.applicationDate}T00:00:00`,
                    ).toLocaleDateString()}
                  />
                  <DetailItem label="Admission year" value={application.admissionYear} />
                </dl>
              </section>
              <section>
                <SectionTitle>Contact</SectionTitle>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Email" value={application.email} />
                  <DetailItem label="Phone" value={application.phone} />
                  <DetailItem
                    label="Location"
                    value={`${application.city}, ${application.state}`}
                  />
                  <DetailItem
                    label="Assigned officer"
                    value={application.assignedOfficer}
                  />
                </dl>
              </section>
            </div>
          ) : null}

          {tab === "personal" ? (
            <section>
              <SectionTitle>Personal information</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Full name" value={application.fullName} />
                <DetailItem label="Gender" value={application.gender} />
                <DetailItem label="Date of birth" value={application.dateOfBirth} />
                <DetailItem label="Email" value={application.email} />
                <DetailItem label="Phone" value={application.phone} />
                <DetailItem label="Address" value={application.address} />
                <DetailItem label="City" value={application.city} />
                <DetailItem label="State" value={application.state} />
                <DetailItem label="Country" value={application.country} />
                <DetailItem label="Nationality" value={application.nationality} />
              </dl>
            </section>
          ) : null}

          {tab === "academic" ? (
            <section>
              <SectionTitle>Academic history</SectionTitle>
              {application.academicHistory.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Board</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>CGPA / Percentage</TableHead>
                      <TableHead>Specialization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.academicHistory.map((record) => (
                      <TableRow key={`${record.level}-${record.year}`}>
                        <TableCell className="font-medium capitalize">
                          {record.level.replace("-", " ")}
                        </TableCell>
                        <TableCell>{record.institution}</TableCell>
                        <TableCell>{record.board}</TableCell>
                        <TableCell>{record.year}</TableCell>
                        <TableCell>{record.score}</TableCell>
                        <TableCell>{record.specialization}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Academic records have not been added.
                </p>
              )}
            </section>
          ) : null}

          {tab === "guardian" ? (
            <section>
              <SectionTitle>Guardian information</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Father name" value={application.guardian.fatherName} />
                <DetailItem label="Mother name" value={application.guardian.motherName} />
                <DetailItem
                  label="Guardian name"
                  value={application.guardian.guardianName}
                />
                <DetailItem label="Occupation" value={application.guardian.occupation} />
                <DetailItem label="Phone" value={application.guardian.phone} />
                <DetailItem label="Email" value={application.guardian.email} />
              </dl>
            </section>
          ) : null}

          {tab === "documents" ? (
            <section className="space-y-4">
              <SectionTitle>Uploaded documents</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {application.documents.map((document) => (
                  <Card key={document.id} padding="sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-2">
                        <FileText
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{document.name}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {document.fileName ?? "Not uploaded"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          document.status === "verified"
                            ? "default"
                            : "outline"
                        }
                        className={
                          document.status === "missing"
                            ? "border-destructive/40 text-destructive"
                            : ""
                        }
                      >
                        {document.status}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-3"
                      disabled={!document.fileName}
                      onClick={() => setPreviewDocument(document.name)}
                    >
                      <ExternalLink aria-hidden="true" />
                      View
                    </Button>
                  </Card>
                ))}
              </div>
              {previewDocument ? (
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Document preview · {previewDocument}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-border flex min-h-40 items-center justify-center rounded-xl border border-dashed">
                      <p className="text-muted-foreground max-w-sm px-4 text-center text-sm">
                        Secure document viewer boundary is ready for a signed backend
                        file URL.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </section>
          ) : null}

          {tab === "interview" ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>Interview status</SectionTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onScheduleInterview(application)}
                >
                  <CalendarClock aria-hidden="true" />
                  Manage interview
                </Button>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Status" value={application.interview.status} />
                <DetailItem label="Date" value={application.interview.date} />
                <DetailItem label="Time" value={application.interview.time} />
                <DetailItem label="Mode" value={application.interview.mode} />
                <DetailItem
                  label="Interview panel"
                  value={application.interview.panel.join(", ")}
                />
                <DetailItem
                  label={
                    application.interview.mode === "online"
                      ? "Meeting link"
                      : "Location"
                  }
                  value={
                    application.interview.mode === "online"
                      ? application.interview.meetingLink
                      : application.interview.location
                  }
                />
              </dl>
              <DetailItem
                label="Interview remarks"
                value={application.interview.remarks}
              />
            </section>
          ) : null}

          {tab === "timeline" ? (
            <section>
              <SectionTitle>Admission timeline</SectionTitle>
              <ol className="relative space-y-0">
                {application.timeline.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < application.timeline.length - 1 ? (
                      <span
                        className={cn(
                          "absolute top-5 left-[0.4375rem] h-full w-px",
                          event.completed ? "bg-primary" : "bg-border",
                        )}
                        aria-hidden="true"
                      />
                    ) : null}
                    {event.completed ? (
                      <CheckCircle2
                        className="text-primary relative z-10 size-4 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="text-muted-foreground relative z-10 size-4 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="-mt-0.5">
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {event.date ?? event.detail ?? "Pending"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {tab === "remarks" ? (
            <section className="space-y-4">
              <SectionTitle>Remarks</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="admission-remark">Add internal remark</Label>
                <Textarea
                  id="admission-remark"
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Add a review note for the admissions team…"
                  rows={3}
                />
                <Button type="button" onClick={submitRemark} disabled={!remark.trim()}>
                  <MessageSquareText aria-hidden="true" />
                  Add remark
                </Button>
              </div>
              <ol className="space-y-3">
                {application.remarks.map((item) => (
                  <li key={item.id} className="border-border rounded-xl border p-3">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {item.author} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
