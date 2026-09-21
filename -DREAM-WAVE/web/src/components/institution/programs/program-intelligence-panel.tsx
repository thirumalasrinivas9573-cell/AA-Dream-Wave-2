"use client";

import { useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ecosystemIntelligenceApi } from "@/lib/api/ecosystem-intelligence";

type Props = {
  programId: string;
};

export function ProgramIntelligencePanel({ programId }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void ecosystemIntelligenceApi
      .getProgramIntelligence(token, programId)
      .then((res) => setIntel(res.intelligence))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load program intelligence"))
      .finally(() => setLoading(false));
  }, [token, programId]);

  if (loading) return <RouteLoading label="Loading program intelligence" />;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!intel) return null;

  const alignment = intel.industryAlignment as {
    level?: string;
    matchedSkills?: string[];
    gapSkills?: string[];
    explanation?: { what: string; why: string; limitation: string };
  } | undefined
  const skills = (intel.skillIntelligence as Array<{ skill: string; evidenceLevel: string; count: number }>) || []
  const curriculum = intel.curriculumRecommendation as { what?: string; why?: string } | null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Industry alignment</CardTitle>
          <CardDescription>Program skills vs available opportunity requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {alignment?.level ? (
            <Badge variant="outline">{alignment.level.replace(/_/g, " ")}</Badge>
          ) : null}
          {alignment?.matchedSkills?.length ? (
            <p>
              <span className="font-medium">Matched:</span> {alignment.matchedSkills.join(", ")}
            </p>
          ) : null}
          {alignment?.gapSkills?.length ? (
            <p>
              <span className="font-medium">Gaps:</span> {alignment.gapSkills.join(", ")}
            </p>
          ) : (
            <p className="text-muted-foreground">No gap skills identified from available data.</p>
          )}
          {alignment?.explanation?.limitation ? (
            <p className="text-muted-foreground text-xs">{alignment.explanation.limitation}</p>
          ) : null}
        </CardContent>
      </Card>

      {skills.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill evidence</CardTitle>
            <CardDescription>Aggregate student evidence by skill</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {skills.slice(0, 10).map((s) => (
                <li key={s.skill}>
                  {s.skill} · {s.evidenceLevel} · {s.count} student(s)
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {curriculum ? (
        <Alert variant="default">
          <p className="font-medium">{curriculum.what}</p>
          <p className="text-muted-foreground text-sm">{curriculum.why}</p>
          <p className="text-muted-foreground mt-1 text-xs">Advisory recommendation — does not modify curriculum.</p>
        </Alert>
      ) : null}
    </div>
  );
}
