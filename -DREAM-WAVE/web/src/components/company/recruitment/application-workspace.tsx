"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { ActivityTimeline } from "@/components/dashboard/dashboard-ui";
import {
  RejectApplicationDialog,
  ReleaseOfferDialog,
  ScheduleInterviewDialog,
} from "@/components/company/recruitment/recruitment-dialogs";
import {
  candidateName,
  formatDate,
  StageBadge,
} from "@/components/company/recruitment/recruitment-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { recruitmentApi } from "@/lib/api/recruitment";
import { useRecruitmentStore } from "@/store/recruitment-store";
import { STAGE_LABELS } from "@/types/recruitment";

const TABS = [
  "Overview",
  "Profile",
  "Answers",
  "Resume",
  "Feedback",
  "Assessment",
  "Interviews",
  "Notes",
  "Offer",
  "Onboarding",
  "Activity",
] as const;

type ApplicationWorkspaceProps = {
  applicationId: string;
};

export function ApplicationWorkspace({ applicationId }: ApplicationWorkspaceProps) {
  const { token } = useAuth();
  const fetchApplication = useRecruitmentStore((s) => s.fetchApplication);
  const transitionStage = useRecruitmentStore((s) => s.transitionStage);
  const addNote = useRecruitmentStore((s) => s.addNote);
  const updateTags = useRecruitmentStore((s) => s.updateTags);
  const clearDetail = useRecruitmentStore((s) => s.clearDetail);
  const loading = useRecruitmentStore((s) => s.loading);
  const error = useRecruitmentStore((s) => s.error);
  const detail = useRecruitmentStore((s) => s.currentDetail);
  const tags = useRecruitmentStore((s) => s.tags);

  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [noteText, setNoteText] = useState("");
  const [nextStage, setNextStage] = useState("");
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [ratings, setRatings] = useState({
    technicalFit: 0,
    communication: 0,
    experienceFit: 0,
    roleFit: 0,
  });
  const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    recommendation: "Further Review",
    strengths: "",
    concerns: "",
    privateNotes: "",
  });

  useEffect(() => {
    if (token) void fetchApplication(token, applicationId);
    return () => clearDetail();
  }, [token, applicationId, fetchApplication, clearDetail]);

  useEffect(() => {
    if (!token || !detail) return;
    void recruitmentApi.getAllowedTransitions(token, applicationId).then((res) => {
      setAllowedTransitions(res.allowedTransitions);
    });
    const r = detail.application.ratings;
    if (r) {
      setRatings({
        technicalFit: r.technicalFit ?? 0,
        communication: r.communication ?? 0,
        experienceFit: r.experienceFit ?? 0,
        roleFit: r.roleFit ?? 0,
      });
    }
  }, [token, applicationId, detail]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !detail) return <RouteLoading label="Loading application" />;

  if (error || !detail) {
    return (
      <EmptyState
        title="Application unavailable"
        description={error || "Could not load this application."}
        action={
          <Link href={COMPANY_ROUTES.applications} className={buttonVariants({ variant: "outline" })}>
            Back to applications
          </Link>
        }
      />
    );
  }

  const { application, notes, activity, assessments, interviews, offer } = detail;
  const snap = application.candidateSnapshot;
  const isTerminal = ["hired", "rejected", "withdrawn"].includes(application.stage);

  async function saveRatings() {
    if (!token) return;
    await recruitmentApi.updateRatings(token, applicationId, ratings);
    await fetchApplication(token, applicationId);
  }

  async function submitFeedback() {
    if (!token || !feedbackInterviewId) return;
    await recruitmentApi.submitInterviewFeedback(token, feedbackInterviewId, feedbackForm);
    setFeedbackInterviewId(null);
    await fetchApplication(token, applicationId);
  }

  return (
    <div className="space-y-6">
      <InstitutionPageHeader
        eyebrow="Application workspace"
        title={candidateName(application)}
        description={`${application.roleTitle} · ${application.institutionName || "Direct applicant"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {!isTerminal ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setInterviewOpen(true)}>
                  Schedule interview
                </Button>
                {application.stage === "selected" ? (
                  <Button size="sm" onClick={() => setOfferOpen(true)}>
                    Release offer
                  </Button>
                ) : null}
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            ) : null}
            <Link href={COMPANY_ROUTES.applications} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Back
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={application.stage} />
        {application.tags?.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
        {application.assignedRecruiterUserId ? (
          <Badge variant="secondary">Recruiter assigned</Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Application overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Applied: {formatDate(application.createdAt)}</p>
              <p>Department: {application.department || "—"}</p>
              <p>Graduation: {application.graduationYear || "—"}</p>
              <p>Skills: {application.skillsSummary || snap.skills?.join(", ") || "—"}</p>
              {!isTerminal ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <select
                    className="form-control"
                    value={nextStage}
                    onChange={(e) => setNextStage(e.target.value)}
                    aria-label="Next stage"
                  >
                    <option value="">Move to stage…</option>
                    {allowedTransitions.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s] || s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!nextStage}
                    onClick={() => {
                      if (token && nextStage) void transitionStage(token, applicationId, nextStage);
                    }}
                  >
                    Update stage
                  </Button>
                </div>
              ) : null}
              {tags.length ? (
                <div className="space-y-2 pt-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const active = application.tags?.includes(tag);
                      return (
                        <Button
                          key={tag}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => {
                            if (!token) return;
                            const next = active
                              ? application.tags.filter((t) => t !== tag)
                              : [...(application.tags || []), tag];
                            void updateTags(token, applicationId, next);
                          }}
                        >
                          {tag}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                items={activity.slice(0, 5).map((a) => ({
                  id: a._id,
                  title: a.title,
                  time: new Date(a.createdAt).toLocaleString(),
                  detail: a.description || "",
                }))}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Candidate profile</CardTitle>
            <CardDescription>Recruitment-safe authorized information only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Name: {snap.name}</p>
            <p>Email: {snap.email || "—"}</p>
            <p>Education: {snap.education?.join("; ") || "—"}</p>
            <p>Experience: {snap.experience?.join("; ") || "—"}</p>
            <p>Projects: {snap.projects?.join("; ") || "—"}</p>
            <p>Certificates: {snap.certificates?.join("; ") || "—"}</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Answers" ? (
        <Card>
          <CardHeader>
            <CardTitle>Application answers</CardTitle>
          </CardHeader>
          <CardContent>
            {application.applicationAnswers?.length ? (
              <ul className="space-y-3 text-sm">
                {application.applicationAnswers.map((a, i) => (
                  <li key={i} className="rounded-lg border p-3">
                    <p className="font-medium">{a.question}</p>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{a.answer}</p>
                    {a.type ? <p className="text-xs text-muted-foreground mt-1">Type: {a.type}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No application answers" description="This role had no custom questions." titleAs="h3" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Resume" ? (
        <Card>
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {application.resumeUrl ? (
              <a href={application.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {application.resumeFileName || "View resume"}
              </a>
            ) : (
              <p className="text-muted-foreground">No resume uploaded.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Feedback" ? (
        <Card>
          <CardHeader>
            <CardTitle>Recruiter evaluation</CardTitle>
            <CardDescription>Human recruiter ratings — not AI scoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["technicalFit", "communication", "experienceFit", "roleFit"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key}>{key.replace(/([A-Z])/g, " $1")}</Label>
                <select
                  id={key}
                  className="form-control w-full max-w-xs"
                  value={ratings[key]}
                  onChange={(e) => setRatings((r) => ({ ...r, [key]: Number(e.target.value) }))}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Not rated" : `${n}/5`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button onClick={() => void saveRatings()}>Save ratings</Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Assessment" ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            {assessments.length ? (
              <ul className="space-y-2 text-sm">
                {assessments.map((a) => (
                  <li key={a._id} className="rounded-lg border p-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-muted-foreground">{a.type} · {a.status}</p>
                    {a.score != null ? <p>Score: {a.score}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No assessments" description="Schedule assessments from the recruitment workflow." titleAs="h3" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Interviews" ? (
        <Card>
          <CardHeader>
            <CardTitle>Interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interviews.length ? (
              <ul className="space-y-2 text-sm">
                {interviews.map((i) => (
                  <li key={i._id} className="rounded-lg border p-3">
                    <p className="font-medium">{i.round}</p>
                    <p className="text-muted-foreground">
                      {formatDate(i.scheduledDate)} · {i.status}
                    </p>
                    {i.feedback?.recommendation ? (
                      <p>Recommendation: {i.feedback.recommendation}</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFeedbackInterviewId(i._id)}>Submit feedback</Button>
                        {i.status === "scheduled" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => void recruitmentApi.cancelInterview(token!, i._id).then(() => fetchApplication(token!, applicationId))}>Cancel</Button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No interviews scheduled" description="Schedule interviews when the candidate reaches interview stages." titleAs="h3" />
            )}
            {feedbackInterviewId ? (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-medium">Interview feedback</p>
                <div className="space-y-2">
                  <Label htmlFor="rec">Recommendation</Label>
                  <select
                    id="rec"
                    className="form-control w-full"
                    value={feedbackForm.recommendation}
                    onChange={(e) => setFeedbackForm((f) => ({ ...f, recommendation: e.target.value }))}
                  >
                    {["Strong Hire", "Hire", "Further Review", "No Hire"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strengths">Strengths</Label>
                  <Textarea id="strengths" value={feedbackForm.strengths} onChange={(e) => setFeedbackForm((f) => ({ ...f, strengths: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concerns">Concerns</Label>
                  <Textarea id="concerns" value={feedbackForm.concerns} onChange={(e) => setFeedbackForm((f) => ({ ...f, concerns: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => void submitFeedback()}>Submit</Button>
                  <Button variant="outline" onClick={() => setFeedbackInterviewId(null)}>Cancel</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Notes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
            <CardDescription>Private company data — never visible to candidates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notes.length ? (
              <ul className="space-y-2 text-sm">
                {notes.map((n) => (
                  <li key={n._id} className="rounded-lg border p-3">
                    <p>{n.content}</p>
                    <p className="text-muted-foreground text-xs">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No recruiter notes yet.</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="note">Add note</Label>
              <Textarea id="note" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
              <Button
                onClick={() => {
                  if (!token || !noteText.trim()) return;
                  void addNote(token, applicationId, noteText).then(() => setNoteText(""));
                }}
              >
                Save note
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Offer" ? (
        <Card>
          <CardHeader>
            <CardTitle>Offer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {offer ? (
              <div className="space-y-1">
                <p>Status: {offer.status}</p>
                <p>Salary: {offer.salary ?? "—"}</p>
                <p>Location: {offer.location || "—"}</p>
                {offer.status === "draft" ? (
                  <Button size="sm" onClick={() => void recruitmentApi.transitionOffer(token!, offer._id, "approve").then(() => fetchApplication(token!, applicationId))}>Approve offer</Button>
                ) : null}
                {offer.status === "approved" ? (
                  <Button size="sm" onClick={() => void recruitmentApi.transitionOffer(token!, offer._id, "send").then(() => fetchApplication(token!, applicationId))}>Send offer</Button>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">No offer yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Onboarding" ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding status</CardTitle>
            <CardDescription>Track post-offer progress through joining.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["offer_accepted", "documents_pending", "background_verification", "onboarding_started", "joining_confirmed", "joined_successfully"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                onClick={() => void recruitmentApi.updateOnboarding(token!, applicationId, s).then(() => fetchApplication(token!, applicationId))}
              >
                {s.replace(/_/g, " ")}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Activity" ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              items={activity.map((a) => ({
                id: a._id,
                title: a.title,
                time: new Date(a.createdAt).toLocaleString(),
                detail: a.description || "",
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <RejectApplicationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        token={token}
        applicationId={applicationId}
      />
      <ScheduleInterviewDialog
        open={interviewOpen}
        onOpenChange={setInterviewOpen}
        token={token}
        applicationId={applicationId}
      />
      <ReleaseOfferDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        token={token}
        applicationId={applicationId}
      />
    </div>
  );
}
