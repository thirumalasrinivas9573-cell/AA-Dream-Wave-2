"use client";

import {
  Award,
  BookOpen,
  Download,
  FileText,
  IdCard,
  MessageSquareText,
  Pencil,
  Printer,
  Send,
  Shuffle,
  UserMinus,
  Users,
} from "lucide-react";
import { useState } from "react";

import { ProgressBar, Sparkline } from "@/components/dashboard/dashboard-ui";
import {
  FacultyDetail,
  FacultyStatusBadge,
} from "@/components/institution/faculty/faculty-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ManagedFaculty } from "@/types/faculty-management";

const TABS = [
  "overview",
  "academic",
  "professional",
  "teaching",
  "research",
  "projects",
  "publications",
  "achievements",
  "certificates",
  "documents",
  "workload",
  "attendance",
  "performance",
  "notes",
] as const;

type FacultyTab = (typeof TABS)[number];

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-3 text-base font-semibold tracking-tight">{children}</h3>;
}

function TagList({ values }: { values: string[] }) {
  return values.length ? (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">{value}</Badge>
      ))}
    </div>
  ) : (
    <p className="text-muted-foreground text-sm">No records added.</p>
  );
}

export function FacultyProfileDrawer({
  faculty,
  open,
  onOpenChange,
  onEdit,
  onTransfer,
  onAssignSubject,
  onAssignMentor,
  onDeactivate,
  onNotify,
  onAddNote,
}: {
  faculty: ManagedFaculty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (faculty: ManagedFaculty) => void;
  onTransfer: (faculty: ManagedFaculty) => void;
  onAssignSubject: (faculty: ManagedFaculty) => void;
  onAssignMentor: (faculty: ManagedFaculty) => void;
  onDeactivate: (faculty: ManagedFaculty) => void;
  onNotify: (faculty: ManagedFaculty) => void;
  onAddNote: (id: string, text: string) => void;
}) {
  const [tab, setTab] = useState<FacultyTab>("overview");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  if (!faculty) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={faculty.fullName}
      description={`${faculty.id} · ${faculty.designation}`}
      className="sm:fixed sm:inset-y-0 sm:right-0 sm:max-h-svh sm:max-w-5xl sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6"
    >
      <div className="space-y-5">
        <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-lg font-semibold">
              {faculty.photoInitials}
            </span>
            <div>
              <FacultyStatusBadge status={faculty.status} />
              <p className="mt-1 text-sm font-medium">{faculty.department}</p>
              <p className="text-muted-foreground text-xs">{faculty.officeLocation}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(faculty)}><Pencil aria-hidden="true" />Edit</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onTransfer(faculty)}><Shuffle aria-hidden="true" />Transfer</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onAssignSubject(faculty)}><BookOpen aria-hidden="true" />Assign subject</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onAssignMentor(faculty)}><Users aria-hidden="true" />Assign mentor</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Printer aria-hidden="true" />Print</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Download aria-hidden="true" />Export</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onNotify(faculty)}><Send aria-hidden="true" />Notify</Button>
            <Button type="button" size="sm" variant="destructive" disabled={faculty.status === "inactive"} onClick={() => onDeactivate(faculty)}><UserMinus aria-hidden="true" />Deactivate</Button>
          </div>
        </div>

        <div className="scroll-region overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Faculty profile">
            {TABS.map((item) => (
              <Button key={item} type="button" role="tab" size="sm" variant={tab === item ? "default" : "ghost"} aria-selected={tab === item} className="capitalize" onClick={() => setTab(item)}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div role="tabpanel" className="min-h-80">
          {tab === "overview" ? (
            <section className="space-y-5">
              <SectionTitle>Faculty overview</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FacultyDetail label="Employee ID" value={faculty.id} />
                <FacultyDetail label="Department" value={faculty.department} />
                <FacultyDetail label="Designation" value={faculty.designation} />
                <FacultyDetail label="Experience" value={`${faculty.totalExperience} years`} />
                <FacultyDetail label="Joining date" value={faculty.joiningDate} />
                <FacultyDetail label="Email" value={faculty.email} />
                <FacultyDetail label="Phone" value={faculty.phone} />
                <FacultyDetail label="Office location" value={faculty.officeLocation} />
              </dl>
              <Card className="bg-muted/20">
                <CardHeader><CardTitle>Faculty identity</CardTitle></CardHeader>
                <CardContent>
                  <Button type="button" variant="outline" onClick={() => window.print()}><IdCard aria-hidden="true" />Generate Faculty ID</Button>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {tab === "academic" ? (
            <section className="space-y-5">
              <SectionTitle>Academic profile</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FacultyDetail label="Highest qualification" value={faculty.highestQualification} />
                <FacultyDetail label="University" value={faculty.university} />
                <FacultyDetail label="Specialization" value={faculty.specialization} />
                <FacultyDetail label="Teaching experience" value={`${faculty.teachingExperience} years`} />
                <FacultyDetail label="Industry experience" value={`${faculty.industryExperience} years`} />
              </dl>
              <div><SectionTitle>Professional certifications</SectionTitle><TagList values={faculty.professionalCertifications} /></div>
              <div><SectionTitle>Research areas</SectionTitle><TagList values={faculty.researchAreas} /></div>
            </section>
          ) : null}

          {tab === "professional" ? (
            <section>
              <SectionTitle>Professional details</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FacultyDetail label="Employment type" value={faculty.employmentType.replace("-", " ")} />
                <FacultyDetail label="Staff category" value={faculty.staffCategory} />
                <FacultyDetail label="Designation" value={faculty.designation} />
                <FacultyDetail label="Department" value={faculty.department} />
                <FacultyDetail label="Total experience" value={`${faculty.totalExperience} years`} />
                <FacultyDetail label="Joining date" value={faculty.joiningDate} />
              </dl>
            </section>
          ) : null}

          {tab === "teaching" ? (
            <section className="space-y-4">
              <SectionTitle>Teaching profile</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {faculty.subjects.map((subject) => (
                  <Card key={subject.id} padding="sm">
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{subject.semester} · {subject.academicYear}</p>
                    <p className="text-muted-foreground mt-2 text-xs">Class: {subject.classAllocation} · Lab: {subject.laboratoryAllocation}</p>
                  </Card>
                ))}
              </div>
              <FacultyDetail label="Mentorship" value={`${faculty.mentoringStudents} students`} />
            </section>
          ) : null}

          {tab === "research" ? (
            <section className="space-y-5">
              <div><SectionTitle>Research papers</SectionTitle><TagList values={faculty.researchPapers} /></div>
              <div><SectionTitle>Journals</SectionTitle><TagList values={faculty.journals} /></div>
              <div><SectionTitle>Conferences</SectionTitle><TagList values={faculty.conferences} /></div>
              <div><SectionTitle>Patents</SectionTitle><TagList values={faculty.patents} /></div>
              <div><SectionTitle>Books published</SectionTitle><TagList values={faculty.booksPublished} /></div>
              <div><SectionTitle>Research collaborations</SectionTitle><TagList values={faculty.researchCollaborations} /></div>
            </section>
          ) : null}

          {tab === "projects" ? (
            <section className="space-y-4">
              <SectionTitle>Projects and funding</SectionTitle>
              {[...faculty.fundedProjects, ...faculty.projects].map((project) => (
                <Card key={project.id} padding="sm">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-muted-foreground text-xs">{project.role} · {project.funding}</p>
                  <Badge variant="outline" className="mt-2">{project.status}</Badge>
                </Card>
              ))}
            </section>
          ) : null}

          {tab === "publications" ? (
            <section>
              <SectionTitle>Publications</SectionTitle>
              <div className="space-y-3">
                {faculty.publications.map((publication) => (
                  <Card key={publication.id} padding="sm">
                    <p className="font-medium">{publication.title}</p>
                    <p className="text-muted-foreground text-xs">{publication.type} · {publication.publisher} · {publication.year}</p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {tab === "achievements" ? (
            <section><SectionTitle>Achievements and recognition</SectionTitle><TagList values={faculty.achievements} /></section>
          ) : null}

          {tab === "certificates" ? (
            <section>
              <SectionTitle>Certificates</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {faculty.certificates.map((certificate) => (
                  <Card key={certificate} padding="sm" className="flex items-center gap-3"><Award className="text-primary size-5" aria-hidden="true" /><span className="text-sm font-medium">{certificate}</span></Card>
                ))}
              </div>
            </section>
          ) : null}

          {tab === "documents" ? (
            <section className="space-y-4">
              <SectionTitle>Document management</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {faculty.documents.map((document) => (
                  <Card key={document.id} padding="sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-2"><FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-medium">{document.name}</p><p className="text-muted-foreground truncate text-xs">{document.fileName ?? "Not uploaded"}</p></div></div>
                      <Badge variant={document.status === "verified" ? "default" : "outline"} className={document.status === "missing" ? "border-destructive/40 text-destructive" : ""}>{document.status}</Badge>
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="mt-2" disabled={!document.fileName} onClick={() => setPreview(document.name)}>View</Button>
                  </Card>
                ))}
              </div>
              {preview ? <Card className="bg-muted/20"><CardHeader><CardTitle className="text-sm">Preview · {preview}</CardTitle></CardHeader><CardContent><div className="border-border flex min-h-40 items-center justify-center rounded-xl border border-dashed"><p className="text-muted-foreground text-sm">Secure viewer ready for a signed document URL.</p></div></CardContent></Card> : null}
            </section>
          ) : null}

          {tab === "workload" ? (
            <section className="space-y-5">
              <SectionTitle>Teaching workload</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-3">
                <FacultyDetail label="Weekly teaching hours" value={faculty.workload.weeklyTeachingHours} />
                <FacultyDetail label="Assigned subjects" value={faculty.workload.assignedSubjects} />
                <FacultyDetail label="Mentoring students" value={faculty.workload.mentoringStudents} />
              </dl>
              <div><SectionTitle>Committee responsibilities</SectionTitle><TagList values={faculty.workload.committeeResponsibilities} /></div>
              <div><SectionTitle>Administrative duties</SectionTitle><TagList values={faculty.workload.administrativeDuties} /></div>
              <div><SectionTitle>Lab responsibilities</SectionTitle><TagList values={faculty.workload.labResponsibilities} /></div>
            </section>
          ) : null}

          {tab === "attendance" ? (
            <section className="space-y-4"><SectionTitle>Attendance</SectionTitle><p className="text-4xl font-semibold">{faculty.attendance}%</p><ProgressBar value={faculty.attendance} label="Faculty attendance" /><p className="text-muted-foreground text-sm">Daily attendance and leave API boundary is ready.</p></section>
          ) : null}

          {tab === "performance" ? (
            <section className="space-y-4"><SectionTitle>Performance</SectionTitle><Sparkline values={faculty.performance} className="h-32" /><p className="text-muted-foreground text-sm">Teaching, research, service, and student-feedback evaluation trend.</p></section>
          ) : null}

          {tab === "notes" ? (
            <section className="space-y-4">
              <SectionTitle>Internal notes</SectionTitle>
              <div className="space-y-2"><Label htmlFor="faculty-note">Add note</Label><Textarea id="faculty-note" value={note} onChange={(event) => setNote(event.target.value)} /><Button type="button" disabled={!note.trim()} onClick={() => { onAddNote(faculty.id, note.trim()); setNote(""); }}><MessageSquareText aria-hidden="true" />Add note</Button></div>
              <ol className="space-y-3">{faculty.notes.map((item) => <li key={item.id} className="border-border rounded-xl border p-3"><p className="text-sm">{item.text}</p><p className="text-muted-foreground mt-2 text-xs">{item.author} · {new Date(item.createdAt).toLocaleString()}</p></li>)}</ol>
            </section>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
