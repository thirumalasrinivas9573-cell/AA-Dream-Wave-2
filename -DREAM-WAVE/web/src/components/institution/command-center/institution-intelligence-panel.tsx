"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AiInsightCard, AnalyticsSection } from "@/components/institution/analytics/analytics-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  institutionIntelligenceApi,
  type InstitutionAiInsight,
} from "@/lib/api/institution-intelligence";

const SUGGESTED_QUESTIONS = [
  { label: "Which programs need attention?", intent: "PROGRAM_ANALYSIS" },
  { label: "How is placement activity progressing?", intent: "PLACEMENT_ANALYSIS" },
  { label: "Which courses have low attendance?", intent: "ACADEMIC_SUPPORT" },
  { label: "What opportunities are active?", intent: "OPPORTUNITY_ANALYSIS" },
  { label: "Institution overview", intent: "INSTITUTION_OVERVIEW" },
  { label: "Admission activity", intent: "ADMISSION_ANALYSIS" },
] as const;

type Props = {
  token: string;
  department?: string;
  academicYear?: string;
};

export function InstitutionIntelligencePanel({ token, department, academicYear }: Props) {
  const [insights, setInsights] = useState<InstitutionAiInsight[]>([]);
  const [mode, setMode] = useState<string>("rule_based");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<string>("INSTITUTION_OVERVIEW");

  const loadInsights = useCallback(
    async (intent: string) => {
      setLoading(true);
      setError(null);
      setActiveIntent(intent);
      try {
        const res = await institutionIntelligenceApi.getAiInsights(token, intent, {
          department,
          academicYear,
        });
        setInsights(res.insights || []);
        setMode(res.mode || "rule_based");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load institution insights");
        setInsights([]);
      } finally {
        setLoading(false);
      }
    },
    [token, department, academicYear],
  );

  useEffect(() => {
    void loadInsights("INSTITUTION_OVERVIEW");
  }, [loadInsights]);

  return (
    <AnalyticsSection
      title="Institution Intelligence"
      description="Explainable insights grounded in authorized institution data. Answers use real database records — never fabricated statistics."
    >
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <Button
            key={q.intent}
            type="button"
            size="sm"
            variant={activeIntent === q.intent ? "default" : "outline"}
            onClick={() => void loadInsights(q.intent)}
            disabled={loading}
          >
            {q.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyzing institution records…
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Mode: {mode === "ai_assisted" ? "AI-assisted (OpenAI)" : "Rule-based intelligence"}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => (
              <AiInsightCard
                key={`${insight.title}-${activeIntent}`}
                title={insight.title}
                description="Institution intelligence"
                badge={activeIntent.replace(/_/g, " ")}
                points={insight.points}
              />
            ))}
          </div>
          {insights.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No insights available</CardTitle>
                <CardDescription>
                  Register students and academic records to populate institution intelligence.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      ) : null}
    </AnalyticsSection>
  );
}
