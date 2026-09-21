"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { ProgressBar, SmartStatCard } from "@/components/dashboard/dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toUserSafeMessage } from "@/lib/errors";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import { useCareerIntelStore } from "@/store/career-intel-store";
import type { AiResumeResult } from "@/types/ai-platform";

type ResumeForm = {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  targetRole: string;
};

function scoreResume(resume: AiResumeResult, form: ResumeForm): number {
  let score = 55;
  if (resume.summary || form.summary) score += 10;
  if ((resume.skills?.length || 0) >= 5 || form.skills.split(",").length >= 5) {
    score += 10;
  }
  if (resume.experience?.length || form.experience.length > 40) score += 10;
  if (resume.tips?.length) score += 5;
  if (form.targetRole.trim()) score += 5;
  return Math.min(96, score);
}

export function AiResumePage() {
  const { token, user } = useAuth();
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const addPrompt = useAiPlatformStore((s) => s.addPrompt);
  const pushNotification = useAiPlatformStore((s) => s.pushNotification);
  const hydrateCareer = useCareerIntelStore((s) => s.hydrate);
  const careerHydrated = useCareerIntelStore((s) => s.hydrated);
  const resumeVersions = useCareerIntelStore((s) => s.resumeVersions);
  const addResumeVersion = useCareerIntelStore((s) => s.addResumeVersion);
  const bumpReadiness = useCareerIntelStore((s) => s.bumpReadiness);

  const [form, setForm] = useState<ResumeForm>({
    name: "",
    email: "",
    phone: "",
    summary: "",
    skills: "",
    experience: "",
    education: "",
    targetRole: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ResumeForm, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<AiResumeResult | null>(null);
  const [score, setScore] = useState(0);

  const nameValue = form.name || user?.name || "";
  const emailValue = form.email || user?.email || "";
  const latest = resumeVersions[0];

  useEffect(() => {
    if (!hydrated) hydrate();
    if (!careerHydrated) hydrateCareer();
  }, [careerHydrated, hydrate, hydrateCareer, hydrated]);

  const validate = () => {
    const next: Partial<Record<keyof ResumeForm, string>> = {};
    if (!nameValue.trim()) next.name = "Name is required.";
    if (!form.skills.trim()) next.skills = "Add at least one skill.";
    if (!form.experience.trim()) next.experience = "Describe your experience.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const generate = async () => {
    if (!token || !validate()) return;
    setLoading(true);
    setError(null);
    addPrompt(`Resume for ${form.targetRole || nameValue}`, "resume");

    try {
      const data = await studentService.ai.resume(
        {
          name: nameValue.trim(),
          email: emailValue.trim(),
          phone: form.phone.trim(),
          summary: form.summary.trim(),
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          experience: form.experience.trim(),
          education: form.education.trim(),
          targetRole: form.targetRole.trim(),
        },
        token,
      );
      setResume(data.resume);
      const nextScore = scoreResume(data.resume, form);
      setScore(nextScore);
      addResumeVersion({
        label: form.targetRole
          ? `${form.targetRole} draft`
          : `Version ${resumeVersions.length + 1}`,
        score: nextScore,
        summary:
          data.resume.summary || data.resume.headline || "AI resume draft",
        suggestions: data.resume.tips?.length
          ? data.resume.tips
          : [
              "Quantify impact with metrics",
              "Align keywords to the target role",
              "Keep the summary under 4 lines",
            ],
        preview:
          data.resume.raw ||
          data.resume.summary ||
          "Generated resume preview unavailable.",
      });
      bumpReadiness(2);
      pushNotification(`Resume draft scored ${nextScore}/100.`);
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof ResumeForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="Resume experience"
        description="Resume dashboard, scoring, improvement suggestions, preview, and version history."
      />
      <CareerIntelNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <SmartStatCard
          label="Resume score"
          value={`${score || latest?.score || 0}`}
          hint="/100"
        />
        <SmartStatCard
          label="Versions"
          value={resumeVersions.length}
          hint="saved drafts"
        />
        <SmartStatCard
          label="Suggestions"
          value={latest?.suggestions.length ?? 0}
          hint="latest improvements"
        />
      </div>

      {error ? (
        <AuthAlert variant="error" title="Resume error" description={error} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Resume builder</CardTitle>
            <CardDescription>
              Required fields: name, skills, and experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["name", "Full name", false],
                ["email", "Email", false],
                ["phone", "Phone", false],
                ["targetRole", "Target role", false],
                ["skills", "Skills (comma-separated)", false],
                ["education", "Education", false],
                ["summary", "Professional summary", true],
                ["experience", "Experience", true],
              ] as const
            ).map(([key, label, multi]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`resume-${key}`}>{label}</Label>
                {multi ? (
                  <Textarea
                    id={`resume-${key}`}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    className="min-h-24"
                    aria-invalid={Boolean(errors[key])}
                  />
                ) : (
                  <Input
                    id={`resume-${key}`}
                    value={
                      key === "name"
                        ? nameValue
                        : key === "email"
                          ? emailValue
                          : form[key]
                    }
                    onChange={(e) => setField(key, e.target.value)}
                    aria-invalid={Boolean(errors[key])}
                  />
                )}
                {errors[key] ? (
                  <p className="text-destructive text-xs">{errors[key]}</p>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              className="h-10"
              disabled={loading}
              onClick={() => void generate()}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {loading ? "Generating…" : "Generate resume"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resume score</CardTitle>
              <CardDescription>
                ATS-oriented readiness for your current draft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar value={score || latest?.score || 0} label="Score" />
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Generating resume" />
            </div>
          ) : null}

          {!loading && !resume && !latest ? (
            <EmptyState
              title="No resume yet"
              description="Fill the form and generate an AI draft with analysis tips."
            />
          ) : null}

          {resume || latest ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {resume?.headline || latest?.label || "Resume draft"}
                  </CardTitle>
                  <CardDescription>
                    {resume?.summary ||
                      latest?.summary ||
                      "Generated professional summary"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {resume?.raw || latest?.preview ? (
                    <p className="whitespace-pre-wrap">
                      {resume?.raw || latest?.preview}
                    </p>
                  ) : resume?.skills?.length ? (
                    <div>
                      <p className="mb-2 font-medium">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {resume.skills.map((skill) => (
                          <span
                            key={skill}
                            className="bg-muted rounded-full px-2.5 py-1 text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {resume?.tips?.length || latest?.suggestions.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Improvement suggestions</CardTitle>
                    <CardDescription>
                      AI recommendations for a stronger resume.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-sm">
                      {(resume?.tips || latest?.suggestions || []).map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          {resumeVersions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Version history</CardTitle>
                <CardDescription>Saved resume drafts and scores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumeVersions.map((version) => (
                  <div
                    key={version.id}
                    className="border-border flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{version.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">{version.score}/100</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
