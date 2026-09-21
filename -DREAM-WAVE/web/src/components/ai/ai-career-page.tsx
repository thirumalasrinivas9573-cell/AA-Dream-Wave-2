"use client";

import Link from "next/link";
import { Eraser } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AiChatPanel, AiPageHeader } from "@/components/ai/ai-shared";
import { CareerDashboardOverview } from "@/components/ai/career/career-dashboard-overview";
import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { CareerRoadmapPanel } from "@/components/ai/career/career-roadmap-panel";
import { AuthAlert } from "@/components/auth/auth-alert";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAREER_CERTIFICATIONS, CAREER_PROMPTS } from "@/constants/ai-platform";
import { CAREER_INTEL_ROUTES, resolveCareerTargetSkills } from "@/constants/career-intelligence";
import { toUserSafeMessage } from "@/lib/errors";
import { studentService } from "@/services/student.service";
import { useAiPlatformStore } from "@/store/ai-platform-store";
import { useCareerIntelStore } from "@/store/career-intel-store";
import type { AiChatMessage, AiUserProfile } from "@/types/ai-platform";

export function AiCareerPage() {
  const { token, user } = useAuth();
  const hydrateAi = useAiPlatformStore((s) => s.hydrate);
  const aiHydrated = useAiPlatformStore((s) => s.hydrated);
  const hydrateCareer = useCareerIntelStore((s) => s.hydrate);
  const careerHydrated = useCareerIntelStore((s) => s.hydrated);
  const bumpReadiness = useCareerIntelStore((s) => s.bumpReadiness);
  const pushNotification = useAiPlatformStore((s) => s.pushNotification);

  const [profile, setProfile] = useState<AiUserProfile>({});
  const [profileDraft, setProfileDraft] = useState({
    currentRole: "",
    targetRole: "",
    skills: "",
  });
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!aiHydrated) hydrateAi();
    if (!careerHydrated) hydrateCareer();
  }, [aiHydrated, careerHydrated, hydrateAi, hydrateCareer]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setHistoryLoading(true);
      setError(null);
      try {
        const [historyRes, profileRes] = await Promise.all([
          studentService.ai.history("career", token!),
          studentService.ai.getProfile(token!),
        ]);
        if (!active) return;
        const p = profileRes.profile || {};
        setProfile(p);
        setProfileDraft({
          currentRole: p.currentRole || "",
          targetRole: p.targetRole || "",
          skills: (p.skills || []).join(", "),
        });
        if (historyRes.messages?.length) {
          setMessages(historyRes.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content: `Hi ${user?.name?.split(" ")[0] || "there"}. I’m Nexus, your career intelligence guide. Tell me your target role and I’ll map readiness, jobs, and interview prep.`,
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setError(toUserSafeMessage(err));
        setMessages([
          {
            role: "assistant",
            content:
              "I’m your career guide. Share your target role to get started.",
          },
        ]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    queueMicrotask(() => {
      void load();
    });
    return () => {
      active = false;
    };
  }, [token, user?.name]);

  const skillGaps = useMemo(() => {
    const current = (profile.skills || []).map((s) => s.toLowerCase());
    const target = resolveCareerTargetSkills(profile.targetRole);
    return target.map((skill) => {
      const owned = current.some(
        (item) =>
          item.includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(item),
      );
      return { skill, owned, score: owned ? 100 : 28 };
    });
  }, [profile.skills, profile.targetRole]);

  const certifications = useMemo(() => {
    const key = (profile.targetRole || "").trim().toLowerCase();
    for (const [role, certs] of Object.entries(CAREER_CERTIFICATIONS)) {
      if (role !== "default" && key.includes(role)) return certs;
    }
    return CAREER_CERTIFICATIONS.default ?? [];
  }, [profile.targetRole]);

  const readyCount = skillGaps.filter((item) => item.owned).length;
  const pathSteps = useMemo(() => {
    const gaps = skillGaps.filter((item) => !item.owned).slice(0, 4);
    return [
      profile.targetRole
        ? `Confirm target role: ${profile.targetRole}`
        : "Define your target role",
      ...gaps.map((item) => `Build skill: ${item.skill}`),
      "Complete a recommended certification",
      "Ship one portfolio project",
    ];
  }, [profile.targetRole, skillGaps]);

  const saveProfile = async () => {
    if (!token) return;
    setSaving(true);
    setProfileError(null);
    try {
      const skills = profileDraft.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await studentService.ai.updateProfile(
        {
          currentRole: profileDraft.currentRole.trim(),
          targetRole: profileDraft.targetRole.trim(),
          skills,
        },
        token,
      );
      setProfile(data.profile);
      bumpReadiness(3);
      pushNotification("Career profile updated. Readiness refreshed.");
      setSummary(
        `Profile synced for ${data.profile.targetRole || "your target role"} with ${skills.length} listed skills.`,
      );
    } catch (err) {
      setProfileError(toUserSafeMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !token || loading) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await studentService.ai.agent(text, "career", token);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      if (text.toLowerCase().includes("summary")) {
        setSummary(data.reply.slice(0, 280));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Career guide is unavailable right now. Please try again shortly.",
        },
      ]);
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    if (!token) return;
    try {
      await studentService.ai.clearHistory("career", token);
      setMessages([
        {
          role: "assistant",
          content: "Conversation cleared. What career question is next?",
        },
      ]);
    } catch (err) {
      setError(toUserSafeMessage(err));
    }
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="AI Career Intelligence"
        description="Personalized guidance, job matching, interview prep, and placement insights in one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={CAREER_INTEL_ROUTES.copilot} className={buttonVariants({ variant: "default", className: "h-10" })}>
              Career Copilot
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void clear()}
            >
              <Eraser className="size-4" aria-hidden="true" />
              Clear chat
            </Button>
          </div>
        }
      />

      <CareerIntelNav />

      <CareerDashboardOverview
        targetRole={profile.targetRole}
        skillReady={readyCount}
        skillTotal={skillGaps.length}
        summary={summary}
        loading={historyLoading && !profile.targetRole}
      />

      <CareerRoadmapPanel
        skillGaps={skillGaps}
        certifications={certifications}
        pathSteps={pathSteps}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Career profile</CardTitle>
            <CardDescription>
              Keep current and target roles updated for better intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileError ? (
              <AuthAlert
                variant="error"
                title="Profile update failed"
                description={profileError}
              />
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="currentRole">Current role</Label>
              <Input
                id="currentRole"
                value={profileDraft.currentRole}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    currentRole: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetRole">Target role</Label>
              <Input
                id="targetRole"
                value={profileDraft.targetRole}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    targetRole: e.target.value,
                  }))
                }
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={profileDraft.skills}
                onChange={(e) =>
                  setProfileDraft((p) => ({ ...p, skills: e.target.value }))
                }
                placeholder="React, SQL, communication"
              />
            </div>
            <Button
              type="button"
              className="h-10"
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <AiChatPanel
          messages={messages}
          loading={loading}
          historyLoading={historyLoading}
          error={error}
          input={input}
          onInputChange={setInput}
          onSend={(text) => void send(text)}
          suggestions={[...CAREER_PROMPTS, "Give me an AI career summary"]}
          placeholder="Ask for career recommendations…"
          toolId="career"
        />
      </div>
    </div>
  );
}
