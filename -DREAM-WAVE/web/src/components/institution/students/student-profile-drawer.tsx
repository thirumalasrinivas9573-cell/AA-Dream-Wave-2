"use client";

import {
  Award,
  Download,
  FileText,
  IdCard,
  MessageSquareText,
  Pencil,
  Printer,
  Send,
  Shuffle,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useState } from "react";

import { ProgressBar, Sparkline } from "@/components/dashboard/dashboard-ui";
import {
  PLACEMENT_STATUS_OPTIONS,
  StudentDetail,
  StudentStatusBadge,
} from "@/components/institution/students/student-management-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ManagedStudent } from "@/types/student-management";

const PROFILE_TABS = [
  "overview",
  "academic",
  "personal",
  "guardian",
  "documents",
  "attendance",
  "performance",
  "skills",
  "projects",
  "certificates",
  "achievements",
  "placement",
  "notes",
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-3 text-base font-semibold tracking-tight">{children}</h3>;
}

function TagList({ values }: { values: string[] }) {
  return values.length ? (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {value}
        </Badge>
      ))}
    </div>
  ) : (
    <p className="text-muted-foreground text-sm">No records added.</p>
  );
}

export function StudentProfileDrawer({
  student,
  open,
  onOpenChange,
  onEdit,
  onTransfer,
  onPromote,
  onDeactivate,
  onNotify,
  onAddNote,
}: {
  student: ManagedStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (student: ManagedStudent) => void;
  onTransfer: (student: ManagedStudent) => void;
  onPromote: (student: ManagedStudent) => void;
  onDeactivate: (student: ManagedStudent) => void;
  onNotify: (student: ManagedStudent) => void;
  onAddNote: (id: string, text: string) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  if (!student) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={student.fullName}
      description={`${student.id} · ${student.rollNumber}`}
      className="sm:fixed sm:inset-y-0 sm:right-0 sm:max-h-svh sm:max-w-5xl sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6"
    >
      <div className="space-y-5">
        <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-lg font-semibold">
              {student.photoInitials}
            </span>
            <div>
              <StudentStatusBadge status={student.status} />
              <p className="mt-1 text-sm font-medium">{student.course}</p>
              <p className="text-muted-foreground text-xs">
                {student.semester} · Section {student.section}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(student)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onTransfer(student)}>
              <Shuffle aria-hidden="true" />
              Transfer
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onPromote(student)}>
              <TrendingUp aria-hidden="true" />
              Promote
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Print
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.print()}
            >
              <Download aria-hidden="true" />
              Export PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onNotify(student)}>
              <Send aria-hidden="true" />
              Notify
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={student.status === "inactive"}
              onClick={() => onDeactivate(student)}
            >
              <UserX aria-hidden="true" />
              Deactivate
            </Button>
          </div>
        </div>

        <div className="scroll-region overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Student profile">
            {PROFILE_TABS.map((item) => (
              <Button
                key={item}
                type="button"
                role="tab"
                size="sm"
                variant={tab === item ? "default" : "ghost"}
                aria-selected={tab === item}
                className="capitalize"
                onClick={() => setTab(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div role="tabpanel" className="min-h-80">
          {tab === "overview" ? (
            <section className="space-y-5">
              <div>
                <SectionTitle>Student overview</SectionTitle>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StudentDetail label="Student ID" value={student.id} />
                  <StudentDetail label="Roll number" value={student.rollNumber} />
                  <StudentDetail label="Department" value={student.department} />
                  <StudentDetail label="Course" value={student.course} />
                  <StudentDetail label="Semester" value={student.semester} />
                  <StudentDetail label="Section" value={student.section} />
                  <StudentDetail label="Batch" value={student.batch} />
                  <StudentDetail label="Admission date" value={student.admissionDate} />
                  <StudentDetail label="Email" value={student.email} />
                  <StudentDetail label="Phone" value={student.phone} />
                </dl>
              </div>
              <Card className="bg-muted/20">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Digital student ID</CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Ready for institution identity service integration.
                      </p>
                    </div>
                    <IdCard className="text-primary size-8" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    Generate ID card
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {tab === "academic" ? (
            <section className="space-y-5">
              <SectionTitle>Academic information</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StudentDetail label="Department" value={student.department} />
                <StudentDetail label="Program" value={student.course} />
                <StudentDetail label="Branch" value={student.branch} />
                <StudentDetail label="Semester" value={student.semester} />
                <StudentDetail label="Credits earned" value={student.creditsEarned} />
                <StudentDetail label="CGPA" value={student.cgpa} />
                <StudentDetail label="Backlogs" value={student.backlogs} />
                <StudentDetail
                  label="Expected graduation"
                  value={student.expectedGraduation}
                />
                <StudentDetail
                  label="Academic advisor"
                  value={student.academicAdvisor}
                />
              </dl>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Current subjects</h4>
                <TagList values={student.currentSubjects} />
              </div>
            </section>
          ) : null}

          {tab === "personal" ? (
            <section>
              <SectionTitle>Personal information</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StudentDetail label="Date of birth" value={student.dateOfBirth} />
                <StudentDetail label="Gender" value={student.gender} />
                <StudentDetail label="Blood group" value={student.bloodGroup} />
                <StudentDetail label="Nationality" value={student.nationality} />
                <StudentDetail label="Address" value={student.address} />
                <StudentDetail label="City" value={student.city} />
                <StudentDetail label="State" value={student.state} />
                <StudentDetail label="Country" value={student.country} />
                <StudentDetail
                  label="Emergency contact"
                  value={student.emergencyContact}
                />
              </dl>
            </section>
          ) : null}

          {tab === "guardian" ? (
            <section>
              <SectionTitle>Guardian information</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StudentDetail label="Father name" value={student.guardian.fatherName} />
                <StudentDetail label="Mother name" value={student.guardian.motherName} />
                <StudentDetail
                  label="Guardian name"
                  value={student.guardian.guardianName}
                />
                <StudentDetail label="Occupation" value={student.guardian.occupation} />
                <StudentDetail label="Email" value={student.guardian.email} />
                <StudentDetail label="Phone" value={student.guardian.phone} />
                <StudentDetail label="Address" value={student.guardian.address} />
              </dl>
            </section>
          ) : null}

          {tab === "documents" ? (
            <section className="space-y-4">
              <SectionTitle>Document management</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {student.documents.map((document) => (
                  <Card key={document.id} padding="sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-2">
                        <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{document.name}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {document.fileName ?? "Not uploaded"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={document.status === "verified" ? "default" : "outline"}
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
                      className="mt-2"
                      disabled={!document.fileName}
                      onClick={() => setPreview(document.name)}
                    >
                      View document
                    </Button>
                  </Card>
                ))}
              </div>
              {preview ? (
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-sm">Preview · {preview}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-border flex min-h-40 items-center justify-center rounded-xl border border-dashed">
                      <p className="text-muted-foreground max-w-sm text-center text-sm">
                        Secure viewer boundary ready for a signed document URL.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </section>
          ) : null}

          {tab === "attendance" ? (
            <section className="space-y-4">
              <SectionTitle>Attendance</SectionTitle>
              <p className="text-4xl font-semibold tabular-nums">{student.attendance}%</p>
              <ProgressBar value={student.attendance} label="Overall attendance" />
              <p className="text-muted-foreground text-sm">
                Subject-level attendance API and absence workflows are ready to connect.
              </p>
            </section>
          ) : null}

          {tab === "performance" ? (
            <section className="space-y-4">
              <SectionTitle>Academic performance</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card padding="sm">
                  <p className="text-muted-foreground text-xs">Current CGPA</p>
                  <p className="mt-1 text-3xl font-semibold">{student.cgpa}</p>
                </Card>
                <Card padding="sm">
                  <p className="text-muted-foreground text-xs">Credits earned</p>
                  <p className="mt-1 text-3xl font-semibold">{student.creditsEarned}</p>
                </Card>
                <Card padding="sm">
                  <p className="text-muted-foreground text-xs">Backlogs</p>
                  <p className="mt-1 text-3xl font-semibold">{student.backlogs}</p>
                </Card>
              </div>
              <Sparkline values={student.performance} className="h-28" />
            </section>
          ) : null}

          {tab === "skills" ? (
            <section className="space-y-5">
              <div>
                <SectionTitle>Technical skills</SectionTitle>
                <TagList values={student.technicalSkills} />
              </div>
              <div>
                <SectionTitle>Soft skills</SectionTitle>
                <TagList values={student.softSkills} />
              </div>
              <div>
                <SectionTitle>Programming languages</SectionTitle>
                <TagList values={student.programmingLanguages} />
              </div>
              <div>
                <SectionTitle>Languages known</SectionTitle>
                <TagList values={student.languagesKnown} />
              </div>
            </section>
          ) : null}

          {tab === "projects" ? (
            <section className="space-y-5">
              <div>
                <SectionTitle>Projects</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {student.projects.map((project) => (
                    <Card key={project.id} padding="sm">
                      <p className="font-medium">{project.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{project.role}</p>
                      <TagList values={project.technologies} />
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>Internships</SectionTitle>
                <TagList values={student.internships} />
              </div>
              <div>
                <SectionTitle>Research papers</SectionTitle>
                <TagList values={student.researchPapers} />
              </div>
            </section>
          ) : null}

          {tab === "certificates" ? (
            <section>
              <SectionTitle>Certificates</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {student.certifications.map((certificate) => (
                  <Card key={certificate.id} padding="sm">
                    <div className="flex gap-3">
                      <Award className="text-primary size-5 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{certificate.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {certificate.category} · {certificate.issuer} ·{" "}
                          {certificate.issuedAt}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {tab === "achievements" ? (
            <section>
              <SectionTitle>Achievements</SectionTitle>
              <TagList values={student.achievements} />
            </section>
          ) : null}

          {tab === "placement" ? (
            <section className="space-y-5">
              <SectionTitle>Placement status</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StudentDetail
                  label="Current status"
                  value={
                    PLACEMENT_STATUS_OPTIONS.find(
                      (option) => option.value === student.placement.status,
                    )?.label
                  }
                />
                <StudentDetail
                  label="Resume uploaded"
                  value={student.placement.resumeUploaded ? "Yes" : "No"}
                />
                <StudentDetail
                  label="Resume score"
                  value={`${student.placement.resumeScore}%`}
                />
                <StudentDetail
                  label="Internships completed"
                  value={student.placement.internshipsCompleted}
                />
                <StudentDetail label="Jobs applied" value={student.placement.jobsApplied} />
                <StudentDetail
                  label="Interview progress"
                  value={student.placement.interviewProgress}
                />
                <StudentDetail label="Offer status" value={student.placement.offerStatus} />
                <StudentDetail
                  label="Career score"
                  value={`${student.placement.careerScore}%`}
                />
              </dl>
              <ProgressBar
                value={student.placement.readiness}
                label="Placement readiness"
              />
            </section>
          ) : null}

          {tab === "notes" ? (
            <section className="space-y-4">
              <SectionTitle>Internal notes</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="student-note">Add note</Label>
                <Textarea
                  id="student-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note for academic or student services teams…"
                />
                <Button
                  type="button"
                  disabled={!note.trim()}
                  onClick={() => {
                    onAddNote(student.id, note.trim());
                    setNote("");
                  }}
                >
                  <MessageSquareText aria-hidden="true" />
                  Add note
                </Button>
              </div>
              <ol className="space-y-3">
                {student.notes.map((item) => (
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
