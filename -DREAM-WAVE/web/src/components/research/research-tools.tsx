"use client";

import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { AI_RESEARCH_TOOLS } from "@/constants/research";
import { toUserSafeMessage } from "@/lib/errors";
import { studentService } from "@/services/student.service";
import { useResearchStore } from "@/store/research-store";

type ResearchToolsPanelProps = {
  projectId: string;
  topic: string;
  content: string;
};

export function ResearchToolsPanel({
  projectId,
  topic,
  content,
}: ResearchToolsPanelProps) {
  const { token } = useAuth();
  const addTimelineEvent = useResearchStore((s) => s.addTimelineEvent);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  const runTool = async (toolId: string) => {
    const tool = AI_RESEARCH_TOOLS.find((item) => item.id === toolId);
    if (!tool || !token) return;
    setActiveTool(toolId);
    setLoading(true);
    setError(null);
    try {
      const payload = `${tool.prompt}${topic}\n\nDraft:\n${content.slice(0, 4000)}`;
      const data = await studentService.ai.agent(payload, "research", token);
      setOutput(data.reply || "");
      addTimelineEvent(projectId, {
        label: `${tool.label} generated`,
        kind: "tool",
      });
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          AI research tools
        </h2>
        <p className="text-muted-foreground text-xs">
          Summary, explanations, questions, flashcards, mind maps, concepts
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {AI_RESEARCH_TOOLS.map((tool) => (
          <Button
            key={tool.id}
            type="button"
            size="sm"
            variant={activeTool === tool.id ? "default" : "outline"}
            disabled={loading}
            onClick={() => void runTool(tool.id)}
          >
            {tool.label}
          </Button>
        ))}
      </div>

      {error ? (
        <AuthAlert variant="error" title="Research tool" description={error} />
      ) : null}

      <div className="border-border min-h-0 flex-1 overflow-y-auto rounded-2xl border p-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner label="Running research tool" />
          </div>
        ) : output ? (
          <pre className="font-sans text-sm whitespace-pre-wrap">{output}</pre>
        ) : (
          <EmptyState
            title="Run a research tool"
            description="Choose a tool to generate insights for this project."
          />
        )}
      </div>
    </div>
  );
}
