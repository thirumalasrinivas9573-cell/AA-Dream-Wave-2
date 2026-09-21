"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import {
  PLACEMENT_STATUS_OPTIONS,
  StudentStatusBadge,
} from "@/components/institution/students/student-management-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { institutionAnalyticsApi } from "@/lib/api/institution-analytics";
import { institutionStudentsApi, type PlacementSummary } from "@/lib/api/institution-students";
import { useStudentManagementStore } from "@/store/student-management-store";

const NOTE_TYPE_LABELS: Record<string, string> = {
  internal: "Internal",
  placement: "Placement Notes",
  academic_followup: "Academic Follow-up",
  counselling: "Counselling Notes",
  verification: "Verification Notes",
  administrative: "Administrative Remarks",
};

const DETAIL_TABS = [
  "Overview",
  "Academic",
  "Projects",
  "Skills",
  "Certificates",
  "Achievements",
  "Placement",
  "Documents",
  "Notes",
] as const;

type StudentDetailPageProps = {
  studentId: string;
};

export function StudentDetailPage({ studentId }: StudentDetailPageProps) {
  const { token } = useAuth();
  const router = useRouter();
  const fetchStudent = useStudentManagementStore((s) => s.fetchStudent);
  const addNote = useStudentManagementStore((s) => s.addNote);
  const updateStudent = useStudentManagementStore((s) => s.updateStudent);
  const verifySkill = useStudentManagementStore((s) => s.verifySkill);
  const students = useStudentManagementStore((s) => s.students);
  const loading = useStudentManagementStore((s) => s.loading);

  const [tab, setTab] = useState<(typeof DETAIL_TABS)[number]>("Overview");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("internal");
  const [adminTagOptions, setAdminTagOptions] = useState<string[]>([]);
  const [skillToVerify, setSkillToVerify] = useState("");
  const [placementSummary, setPlacementSummary] = useState<PlacementSummary | null>(null);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (token) void fetchStudent(token, studentId);
  }, [token, studentId, fetchStudent]);

  useEffect(() => {
    if (!token) return;
    void institutionAnalyticsApi.getPermissions(token).then((res) => {
      setAdminTagOptions(res.adminTags);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void institutionStudentsApi.getPlacementSummary(token, studentId).then((res) => {
      setPlacementSummary(res.summary);
    });
  }, [token, studentId]);

  const student = students.find((s) => s.id === studentId);

  async function toggleAdminTag(tag: string) {
    if (!token || !student) return;
    setSavingTags(true);
    const current = student.adminTags || [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    try {
      await updateStudent(studentId, { adminTags: next }, token);
    } finally {
      setSavingTags(false);
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !student) return <RouteLoading label="Loading student profile" />;

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="This student record is unavailable or you do not have access."
        action={
          <Link href={INSTITUTION_ROUTES.students} className={buttonVariants({ variant: "outline" })}>
            Back to directory
          </Link>
        }
      />
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Student Intelligence"
        title={student.fullName}
        description={`${student.rollNumber} · ${student.department} · ${student.course}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(INSTITUTION_ROUTES.students)}>
              Back to directory
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StudentStatusBadge status={student.status} />
        <Badge variant="outline">{student.placement.status.replace(/-/g, " ")}</Badge>
        <Badge variant="secondary">{student.semester}</Badge>
        {(student.adminTags || []).map((tag) => (
          <Badge key={tag} variant="muted">{tag}</Badge>
        ))}
      </div>

      {adminTagOptions.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrative tags</CardTitle>
            <CardDescription>Controlled institution tags — not visible to students or AI memory.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {adminTagOptions.map((tag) => {
              const active = (student.adminTags || []).includes(tag);
              return (
                <Button
                  key={tag}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={savingTags}
                  onClick={() => void toggleAdminTag(tag)}
                >
                  {tag}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {DETAIL_TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      {tab === "Overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Institution-authorized student information only.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Email:</span> {student.email || "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {student.phone || "—"}</p>
            <p><span className="text-muted-foreground">Batch:</span> {student.batch || "—"}</p>
            <p><span className="text-muted-foreground">Section:</span> {student.section || "—"}</p>
            <p><span className="text-muted-foreground">CGPA:</span> {student.cgpa || "—"}</p>
            <p><span className="text-muted-foreground">Attendance:</span> {student.attendance}%</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Academic" ? (
        <Card>
          <CardHeader><CardTitle>Academic</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Advisor: {student.academicAdvisor || "—"}</p>
            <p>Backlogs: {student.backlogs}</p>
            <p>Expected graduation: {student.expectedGraduation || "—"}</p>
            <p>Current subjects: {student.currentSubjects.join(", ") || "—"}</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Projects" ? (
        <Card>
          <CardHeader><CardTitle>Shared projects</CardTitle></CardHeader>
          <CardContent>
            {student.projects.length ? (
              <ul className="space-y-3 text-sm">
                {student.projects.map((p) => (
                  <li key={p.id} className="rounded-lg border p-3">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground">{p.role} · {p.technologies.join(", ")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No shared projects.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Skills" ? (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Shared and institution-verified skills only — no AI scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Shared skills</p>
              <div className="flex flex-wrap gap-2">
                {student.technicalSkills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="form-control max-w-xs"
                placeholder="Verify a skill…"
                value={skillToVerify}
                onChange={(e) => setSkillToVerify(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (token && skillToVerify) {
                    void verifySkill(studentId, skillToVerify, token);
                    setSkillToVerify("");
                  }
                }}
              >
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Certificates" ? (
        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
            <CardDescription>Only shared, public, institution-issued, or verified certificates are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            {student.certifications.length ? (
              <ul className="space-y-3 text-sm">
                {student.certifications.map((c, i) => (
                  <li key={c.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{c.title}</p>
                      <Badge variant="outline">{(c as { verificationStatus?: string }).verificationStatus || "SELF_UPLOADED"}</Badge>
                    </div>
                    <p className="text-muted-foreground">{(c as { issuingOrganization?: string }).issuingOrganization || c.issuer}</p>
                    <p className="text-muted-foreground text-xs">
                      Issued: {c.issuedAt || "—"}
                      {(c as { expiryDate?: string }).expiryDate ? ` · Expires: ${(c as { expiryDate?: string }).expiryDate}` : ""}
                    </p>
                    {(c as { credentialId?: string }).credentialId ? (
                      <p className="text-xs">Credential ID: {(c as { credentialId?: string }).credentialId}</p>
                    ) : null}
                    {(c as { certificateUrl?: string }).certificateUrl ? (
                      <a href={(c as { certificateUrl?: string }).certificateUrl} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">
                        View certificate
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        if (token) void institutionStudentsApi.verifyCertificate(token, studentId, i).then(() => fetchStudent(token, studentId));
                      }}
                    >
                      Verify
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No authorized certificates on record.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Achievements" ? (
        <Card>
          <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
          <CardContent>
            {student.achievements.length ? (
              <ul className="space-y-2 text-sm">
                {student.achievements.map((a, i) => {
                  const ach = typeof a === "string" ? { title: a, verificationStatus: "pending" } : a as { title: string; type?: string; verificationStatus?: string };
                  return (
                    <li key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{ach.title}</p>
                        {ach.type ? <p className="text-muted-foreground text-xs">{ach.type}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ach.verificationStatus === "verified" ? "default" : "outline"}>
                          {ach.verificationStatus || "pending"}
                        </Badge>
                        {ach.verificationStatus !== "verified" ? (
                          <Button size="sm" variant="outline" onClick={() => {
                            if (token) void institutionStudentsApi.verifyAchievement(token, studentId, i).then(() => fetchStudent(token, studentId));
                          }}>
                            Verify
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No achievements recorded.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Placement" ? (
        <Card>
          <CardHeader><CardTitle>Placement summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {placementSummary ? (
              <>
                <p>Lifecycle: {placementSummary.placementLifecycle.replace(/_/g, " ")}</p>
                <p>Source: {placementSummary.placementStatusSource}</p>
                <p>Resume uploaded: {placementSummary.resumeUploaded ? "Yes" : "No"}</p>
                <p>Projects shared: {placementSummary.projectsShared}</p>
                <p>Certificates shared: {placementSummary.certificatesShared}</p>
                <p>Authorized applications: {placementSummary.authorizedApplications}</p>
                <p>Interview readiness: {placementSummary.interviewReadiness || "—"}</p>
              </>
            ) : (
              <>
                <p>Status: {PLACEMENT_STATUS_OPTIONS.find((o) => o.value === student.placement.status)?.label || student.placement.status}</p>
                <p>Jobs applied: {student.placement.jobsApplied}</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Documents" ? (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent>
            {student.documents.length ? (
              <ul className="space-y-2 text-sm">
                {student.documents.map((d) => (
                  <li key={d.id} className="flex justify-between rounded-lg border p-3">
                    <span>{d.name}</span>
                    <Badge variant="outline">{d.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No documents on record.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Notes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Institution notes</CardTitle>
            <CardDescription>Private institution data — never visible to students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.notes.length ? (
              <ul className="space-y-2 text-sm">
                {student.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline">{NOTE_TYPE_LABELS[n.type || "internal"] || n.type}</Badge>
                    </div>
                    <p>{n.text}</p>
                    <p className="text-muted-foreground text-xs">{n.author} · {new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No institution notes yet.</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="form-control sm:w-56"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                aria-label="Note type"
              >
                {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                className="form-control flex-1"
                placeholder="Add institution note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (token && noteText.trim()) {
                    void addNote(studentId, noteText, "Institution Staff", token, noteType).then(() => setNoteText(""));
                  }
                }}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
