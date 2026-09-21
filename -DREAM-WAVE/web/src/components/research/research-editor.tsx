"use client";

import { useEffect, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_WRITING_ACTIONS } from "@/constants/research";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import { useResearchStore } from "@/store/research-store";

type ResearchEditorProps = {
  projectId: string;
  content: string;
  onChange: (value: string) => void;
};

export function ResearchEditor({
  projectId,
  content,
  onChange,
}: ResearchEditorProps) {
  const { token } = useAuth();
  const addTimelineEvent = useResearchStore((s) => s.addTimelineEvent);
  const [preview, setPreview] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState("");
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setPreview((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runAction = async (actionId: string) => {
    const action = AI_WRITING_ACTIONS.find((item) => item.id === actionId);
    if (!action || !token) return;
    const source = selection.trim() || content.trim();
    if (!source) {
      setError("Add some text before using the writing assistant.");
      return;
    }
    setLoadingAction(actionId);
    setError(null);
    try {
      const data = await studentService.ai.agent(
        `${action.prompt}${source}`,
        "research",
        token,
      );
      const reply = data.reply?.trim();
      if (!reply) return;
      if (selection && areaRef.current) {
        const start = areaRef.current.selectionStart;
        const end = areaRef.current.selectionEnd;
        const next =
          content.slice(0, start) + reply + content.slice(end);
        onChange(next);
      } else {
        onChange(reply);
      }
      addTimelineEvent(projectId, {
        label: `AI ${action.label} applied`,
        kind: "tool",
      });
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Smart research editor
          </h2>
          <p className="text-muted-foreground text-xs">
            Markdown supported · Ctrl/Cmd+E toggles preview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={preview ? "outline" : "default"}
            onClick={() => setPreview(false)}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={preview ? "default" : "outline"}
            onClick={() => setPreview(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="toolbar"
        aria-label="AI writing assistant"
      >
        {AI_WRITING_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(loadingAction)}
            onClick={() => void runAction(action.id)}
          >
            {loadingAction === action.id ? "Working…" : action.label}
          </Button>
        ))}
      </div>

      {error ? (
        <AuthAlert variant="error" title="Writing assistant" description={error} />
      ) : null}

      {loadingAction ? (
        <div className="flex justify-center py-2">
          <Spinner label="AI writing" />
        </div>
      ) : null}

      {preview ? (
        <article
          className="border-border bg-card/40 prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto rounded-2xl border p-4 whitespace-pre-wrap"
          aria-label="Markdown preview"
        >
          {content || "Nothing to preview yet."}
        </article>
      ) : (
        <Textarea
          ref={areaRef}
          value={content}
          onChange={(event) => onChange(event.target.value)}
          onSelect={(event) => {
            const target = event.currentTarget;
            setSelection(
              target.value.slice(target.selectionStart, target.selectionEnd),
            );
          }}
          className={cn(
            "border-border bg-card/40 min-h-[22rem] flex-1 resize-none rounded-2xl font-mono text-sm",
          )}
          aria-label="Research draft editor"
          placeholder="# Research title&#10;&#10;Write in Markdown…"
        />
      )}
    </div>
  );
}
