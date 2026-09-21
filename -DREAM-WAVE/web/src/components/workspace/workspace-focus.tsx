"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WorkspaceNav,
  WorkspacePageHeader,
} from "@/components/workspace/workspace-nav";
import { useWorkspaceStore } from "@/store/workspace-store";

export function WorkspaceFocusPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const pomodoroLength = useWorkspaceStore((s) => s.pomodoroLength);
  const breakLength = useWorkspaceStore((s) => s.breakLength);
  const setPomodoroLengths = useWorkspaceStore((s) => s.setPomodoroLengths);
  const completeFocusSession = useWorkspaceStore((s) => s.completeFocusSession);
  const focusMinutesToday = useWorkspaceStore((s) => s.focusMinutesToday);
  const productivityScore = useWorkspaceStore((s) => s.productivityScore);
  const sessions = useWorkspaceStore((s) => s.sessions);
  const dailyInsights = useWorkspaceStore((s) => s.dailyInsights);
  const weeklyInsights = useWorkspaceStore((s) => s.weeklyInsights);

  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(pomodoroLength * 60);
  const [syncedLengths, setSyncedLengths] = useState(
    `${pomodoroLength}-${breakLength}`,
  );
  const lengthKey = `${pomodoroLength}-${breakLength}`;
  if (lengthKey !== syncedLengths) {
    setSyncedLengths(lengthKey);
    setSecondsLeft((mode === "focus" ? pomodoroLength : breakLength) * 60);
  }
  const [running, setRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          completeFocusSession({
            mode,
            minutes: mode === "focus" ? pomodoroLength : breakLength,
          });
          const nextMode = mode === "focus" ? "break" : "focus";
          setMode(nextMode);
          return (nextMode === "focus" ? pomodoroLength : breakLength) * 60;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    breakLength,
    completeFocusSession,
    mode,
    pomodoroLength,
    running,
  ]);

  const display = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  const breakSuggestion =
    focusMinutesToday >= 75
      ? "Take a 15-minute walk — you’ve stacked strong focus today."
      : sessions.filter((item) => item.mode === "focus").length >= 2
        ? "After this block, stretch and refill water."
        : "Stay with the current block; a short break unlocks after two sessions.";

  if (!hydrated) {
    return (
      <div className="container-app flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading focus tools" />
      </div>
    );
  }

  return (
    <div
      className={`container-app flex flex-1 flex-col gap-6 py-8 md:py-10 ${
        focusMode ? "bg-background" : ""
      }`}
    >
      <WorkspacePageHeader
        title="AI productivity"
        description="Focus mode, pomodoro timer, break suggestions, and productivity insights."
        actions={
          <Button
            type="button"
            variant={focusMode ? "default" : "outline"}
            className="h-10"
            aria-pressed={focusMode}
            onClick={() => setFocusMode((value) => !value)}
          >
            {focusMode ? "Exit focus mode" : "Enter focus mode"}
          </Button>
        }
      />
      {!focusMode ? <WorkspaceNav /> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pomodoro timer</CardTitle>
            <CardDescription>
              {mode === "focus" ? "Focus block" : "Smart break"} · score{" "}
              {productivityScore}
            </CardDescription>
            <p
              className="mt-6 text-center text-6xl font-semibold tracking-tight tabular-nums"
              aria-live="polite"
            >
              {display}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="h-10"
                onClick={() => setRunning((value) => !value)}
              >
                {running ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {running ? "Pause" : "Start"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => {
                  setRunning(false);
                  setSecondsLeft(
                    (mode === "focus" ? pomodoroLength : breakLength) * 60,
                  );
                }}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => {
                  setRunning(false);
                  const next = mode === "focus" ? "break" : "focus";
                  setMode(next);
                  setSecondsLeft(
                    (next === "focus" ? pomodoroLength : breakLength) * 60,
                  );
                }}
              >
                Switch to {mode === "focus" ? "break" : "focus"}
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {[15, 25, 45].map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  size="sm"
                  variant={pomodoroLength === minutes ? "default" : "outline"}
                  onClick={() => setPomodoroLengths(minutes, breakLength)}
                >
                  Focus {minutes}m
                </Button>
              ))}
              {[5, 10, 15].map((minutes) => (
                <Button
                  key={`b-${minutes}`}
                  type="button"
                  size="sm"
                  variant={breakLength === minutes ? "default" : "outline"}
                  onClick={() => setPomodoroLengths(pomodoroLength, minutes)}
                >
                  Break {minutes}m
                </Button>
              ))}
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Smart break suggestion</CardTitle>
              <CardDescription className="text-foreground/90 mt-2 text-sm">
                {breakSuggestion}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Productivity score</CardTitle>
              <p className="mt-2 text-4xl font-semibold">{productivityScore}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {focusMinutesToday} focused minutes today
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>

      {!focusMode ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily insights</CardTitle>
              <ul className="mt-3 space-y-2 text-sm">
                {dailyInsights.map((item) => (
                  <li
                    key={item.id}
                    className="border-border rounded-xl border px-3 py-2"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly insights</CardTitle>
              <ul className="mt-3 space-y-2 text-sm">
                {weeklyInsights.map((item) => (
                  <li
                    key={item.id}
                    className="border-border rounded-xl border px-3 py-2"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </CardHeader>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
