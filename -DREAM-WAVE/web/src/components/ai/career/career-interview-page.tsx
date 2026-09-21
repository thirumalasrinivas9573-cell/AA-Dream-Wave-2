"use client";

import { useCallback, useEffect, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  careerReadinessApi,
  type AnswerEvaluation,
  type InterviewQuestion,
  type InterviewSession,
} from "@/lib/api/career-readiness";
import { toUserSafeMessage } from "@/lib/errors";

const MODES = [
  { id: "TECHNICAL", label: "Technical", detail: "Concepts, systems, and role depth" },
  { id: "BEHAVIORAL", label: "Behavioral", detail: "STAR stories and communication" },
  { id: "HR", label: "HR", detail: "Communication and situational questions" },
  { id: "PROJECT", label: "Project", detail: "Questions about your portfolio projects" },
  { id: "SYSTEM_DESIGN", label: "System Design", detail: "Architecture and trade-offs" },
  { id: "CODING", label: "Coding", detail: "Problem prompts and reasoning" },
  { id: "MIXED", label: "Mixed", detail: "Combined practice round" },
] as const;

const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export function CareerInterviewPage() {
  const { token } = useAuth();
  const [mode, setMode] = useState<string>("TECHNICAL");
  const [difficulty, setDifficulty] = useState<string>("INTERMEDIATE");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [report, setReport] = useState<InterviewSession["report"] | null>(null);
  const [history, setHistory] = useState<Array<{
    sessionId: string;
    mode: string;
    targetRole: string;
    reportSummary?: string;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await careerReadinessApi.history(token);
      setHistory(res.history);
    } catch {
      /* history optional on first load */
    }
  }, [token]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const startInterview = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setEvaluation(null);
    setReport(null);
    setAnswer("");
    try {
      const res = await careerReadinessApi.startInterview(token, {
        mode,
        difficulty,
        questionCount: 3,
      });
      setSession(res.session);
      setCurrentQuestion(res.currentQuestion);
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!token || !session || !currentQuestion || !answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await careerReadinessApi.submitAnswer(token, session._id, {
        questionId: currentQuestion.questionId,
        answerText: answer.trim(),
      });
      setEvaluation(res.evaluation);
      if (res.sessionComplete) {
        setReport(res.report);
        setCurrentQuestion(null);
        await loadHistory();
      } else if (res.nextQuestion) {
        setCurrentQuestion(res.nextQuestion);
        setAnswer("");
        setEvaluation(null);
      }
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="AI Mock Interview"
        description="Practice technical, behavioral, project, and system design interviews with structured feedback."
      />
      <CareerIntelNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Sessions completed</CardDescription>
            <CardTitle className="text-2xl">{history.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active mode</CardDescription>
            <CardTitle className="text-lg">{mode}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Difficulty</CardDescription>
            <CardTitle className="text-lg">{difficulty}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            disabled={!!session && session.status === "IN_PROGRESS"}
            className={
              mode === item.id
                ? "border-border bg-muted/50 ring-ring rounded-2xl border p-4 text-left ring-2"
                : "border-border hover:bg-muted/30 rounded-2xl border p-4 text-left"
            }
            aria-pressed={mode === item.id}
          >
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground mt-1 text-xs">{item.detail}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={difficulty === d ? "default" : "outline"}
            onClick={() => setDifficulty(d)}
            disabled={!!session && session.status === "IN_PROGRESS"}
          >
            {d}
          </Button>
        ))}
      </div>

      {error ? (
        <AuthAlert variant="error" title="Interview notice" description={error} />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Mock interview</CardTitle>
            <CardDescription>
              Configure type and difficulty, then start your practice session.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => void startInterview()}
            disabled={loading || (!!session && session.status === "IN_PROGRESS" && !!currentQuestion)}
          >
            {loading && !currentQuestion ? "Starting…" : session?.status === "IN_PROGRESS" ? "Session active" : "Start interview"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && !currentQuestion && !report ? (
            <div className="flex justify-center py-8">
              <Spinner label="Preparing session" />
            </div>
          ) : null}

          {currentQuestion ? (
            <div className="border-border rounded-xl border px-4 py-3 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground text-xs uppercase">Question</p>
                <Badge variant="outline">{currentQuestion.sourceLabel}</Badge>
              </div>
              <p className="whitespace-pre-wrap">{currentQuestion.text}</p>
            </div>
          ) : !report ? (
            <EmptyState
              title="Start a practice round"
              description="Choose mode and difficulty, then start your mock interview."
            />
          ) : null}

          {currentQuestion ? (
            <>
              <Textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer…"
                className="min-h-28"
                aria-label="Interview answer"
                disabled={loading}
              />
              <Button
                type="button"
                disabled={!answer.trim() || loading}
                onClick={() => void submitAnswer()}
              >
                {loading ? "Evaluating…" : "Submit answer"}
              </Button>
            </>
          ) : null}

          {evaluation ? (
            <div className="border-border bg-muted/30 space-y-2 rounded-xl border px-4 py-3 text-sm">
              {evaluation.strengths.length ? (
                <div>
                  <p className="font-medium">Strengths</p>
                  <ul className="text-muted-foreground list-inside list-disc">
                    {evaluation.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.missing.length ? (
                <div>
                  <p className="font-medium">Missing</p>
                  <ul className="text-muted-foreground list-inside list-disc">
                    {evaluation.missing.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.improve.length ? (
                <div>
                  <p className="font-medium">How to improve</p>
                  <ul className="text-muted-foreground list-inside list-disc">
                    {evaluation.improve.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.modelStructure ? (
                <p className="text-muted-foreground text-xs">
                  Model structure: {evaluation.modelStructure}
                </p>
              ) : null}
              {evaluation.followUp ? (
                <p className="text-xs">
                  Follow-up: <span className="italic">{evaluation.followUp}</span>
                </p>
              ) : null}
              {evaluation.flags?.length ? (
                <p className="text-amber-600 text-xs">{evaluation.flags.join(". ")}</p>
              ) : null}
            </div>
          ) : null}

          {report ? (
            <div className="border-border space-y-2 rounded-xl border px-4 py-3 text-sm">
              <p className="font-medium">Session report</p>
              <p>{report.summary}</p>
              {report.weakAreas?.length ? (
                <p className="text-muted-foreground">
                  Weak areas: {report.weakAreas.join(", ")}
                </p>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => void startInterview()}>
                New session
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Interview history</h2>
        {history.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Completed mock interviews will appear here."
          />
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.sessionId}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base capitalize">
                      {item.mode.toLowerCase()} — {item.targetRole}
                    </CardTitle>
                    <CardDescription>
                      {new Date(item.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </CardHeader>
                {item.reportSummary ? (
                  <CardContent className="text-muted-foreground text-sm">
                    {item.reportSummary}
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
