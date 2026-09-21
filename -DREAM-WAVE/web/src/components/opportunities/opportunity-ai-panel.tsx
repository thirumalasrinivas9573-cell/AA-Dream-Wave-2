"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AI_OPPORTUNITY_PROMPTS } from "@/constants/opportunities";
import { opportunitiesApi, type AiInsight, type MatchedOpportunity } from "@/lib/api/opportunities";

type Props = {
  token: string;
  onPrepareSelect?: (item: MatchedOpportunity) => void;
};

export function OpportunityAiPanel({ token }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [open, setOpen] = useState(false);

  async function runIntent(intent: string, q?: string) {
    setLoading(true);
    setError(null);
    try {
      if (q && intent === "OPPORTUNITY_DISCOVERY") {
        const res = await opportunitiesApi.discover(token, q);
        const aiRes = await opportunitiesApi.getAiInsights(token, { intent, query: q });
        setInsight(aiRes.insights);
        void res;
      } else {
        const res = await opportunitiesApi.getAiInsights(token, {
          intent,
          ...(q ? { query: q } : {}),
        });
        setInsight(res.insights);
      }
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full lg:max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="text-primary size-4" />
          AI Opportunity Assistant
        </CardTitle>
        <CardDescription>Evidence-based guidance using your authorized profile data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Find AI hackathons for me…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) void runIntent("OPPORTUNITY_DISCOVERY", query.trim());
            }}
            aria-label="Natural language opportunity search"
          />
          <Button
            size="sm"
            disabled={loading || !query.trim()}
            onClick={() => void runIntent("OPPORTUNITY_DISCOVERY", query.trim())}
          >
            Ask
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AI_OPPORTUNITY_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="bg-muted hover:bg-muted/80 rounded-full px-2.5 py-1 text-xs transition-colors"
              onClick={() => {
                setQuery(prompt);
                void runIntent(
                  prompt.includes("deadline")
                    ? "OPPORTUNITY_DEADLINE"
                    : prompt.includes("prepare")
                      ? "OPPORTUNITY_PREPARATION"
                      : "OPPORTUNITY_DISCOVERY",
                  prompt,
                );
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        {open && insight && (
          <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
            <p className="font-medium">{insight.insight.observation}</p>
            <p className="text-muted-foreground">{insight.insight.interpretation}</p>
            {insight.aiSummary && <p className="text-muted-foreground border-t pt-2">{insight.aiSummary}</p>}
            <p className="text-muted-foreground text-xs italic">{insight.insight.limitation}</p>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
