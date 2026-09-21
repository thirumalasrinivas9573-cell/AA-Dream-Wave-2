"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { CareerIntelNav } from "@/components/ai/career/career-nav";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  studentRecruitmentApi,
  type StudentApplication,
  type StudentOpportunity,
} from "@/lib/api/student-recruitment";

export function CareerJobsPage() {
  const { token, user } = useAuth();
  const useLiveApi = Boolean(token) && user?.role === "student";

  const [opportunities, setOpportunities] = useState<StudentOpportunity[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "recommended" | "internship" | "applied">("all");
  const [hasInstitutionLink, setHasInstitutionLink] = useState(true);

  const load = useCallback(async () => {
    if (!token || !useLiveApi) return;
    setLoading(true);
    setError(null);
    try {
      const [browseRes, appsRes] = await Promise.all([
        studentRecruitmentApi.browseOpportunities(token, {
          recommendedOnly: filter === "recommended" ? "true" : undefined,
          opportunityType: filter === "internship" ? "internship" : undefined,
        }),
        studentRecruitmentApi.listApplications(token),
      ]);
      setOpportunities(browseRes.items);
      setApplications(appsRes.applications);
      setHasInstitutionLink(browseRes.hasInstitutionLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [token, useLiveApi, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const appliedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const app of applications) {
      if (app.campusOpportunityId) ids.add(app.campusOpportunityId);
      if (app.jobId) ids.add(app.jobId);
      if (app.internshipId) ids.add(app.internshipId);
    }
    return ids;
  }, [applications]);

  const filtered = useMemo(() => {
    if (filter === "applied") {
      return opportunities.filter((item) => appliedIds.has(item.id));
    }
    return opportunities;
  }, [appliedIds, filter, opportunities]);

  async function handleApply(item: StudentOpportunity) {
    if (!token) return;
    try {
      await studentRecruitmentApi.apply(token, item.sourceType, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed");
    }
  }

  if (!useLiveApi) {
    return (
      <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
        <AiPageHeader
          title="Job matching"
          description="Sign in as a student linked to an institution to browse live placement opportunities."
        />
        <CareerIntelNav />
        <EmptyState
          title="Live recruitment requires a student account"
          description="Connect your student profile to an institution to discover and apply to campus opportunities."
        />
      </div>
    );
  }

  if (loading && !opportunities.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading opportunities" />
      </div>
    );
  }

  return (
    <div className="container-app page-stack flex flex-1 flex-col py-8 md:py-10">
      <AiPageHeader
        title="Job matching"
        description="Live placement opportunities with explainable eligibility and skill evidence matching."
      />
      <CareerIntelNav />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!hasInstitutionLink ? (
        <EmptyState
          title="Institution link required"
          description="Your account must be linked to an institution student record to browse campus opportunities."
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "recommended", label: "Recommended" },
            { id: "internship", label: "Internships" },
            { id: "applied", label: "Applied" },
          ] as const
        ).map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching opportunities"
          description="No open campus, job, or internship opportunities match your current filters."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const applied = appliedIds.has(item.id);
            const rec = item.recommendation;
            return (
              <Card key={`${item.sourceType}-${item.id}`} className="transition-transform hover:-translate-y-0.5">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>
                        {item.companyName || "Institution opportunity"}
                        {item.location ? ` · ${item.location}` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {rec.explainableScore?.skillCoverage ?? 0}% skills
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.opportunityType}</Badge>
                    <Badge
                      variant={
                        rec.eligibility.result === "ELIGIBLE"
                          ? "default"
                          : rec.eligibility.result === "NEEDS_REVIEW"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {rec.eligibility.result.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {item.requiredSkills.length ? (
                    <p className="text-muted-foreground text-xs">
                      Skills: {item.requiredSkills.join(", ")}
                    </p>
                  ) : null}
                  {rec.signals.length ? (
                    <ul className="text-muted-foreground list-disc pl-4 text-xs">
                      {rec.signals.slice(0, 3).map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleApply(item)}
                    disabled={applied || rec.eligibility.result === "NOT_ELIGIBLE"}
                  >
                    {applied ? "Applied" : "Apply"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
