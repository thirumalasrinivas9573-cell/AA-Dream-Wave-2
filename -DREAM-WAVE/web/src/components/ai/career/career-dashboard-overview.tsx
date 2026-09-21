"use client";

import Link from "next/link";

import {
  MiniBarChart,
  ProgressBar,
  SmartStatCard,
} from "@/components/dashboard/dashboard-ui";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CAREER_INTEL_ROUTES } from "@/constants/career-intelligence";
import { cn } from "@/lib/utils";
import { useCareerIntelStore } from "@/store/career-intel-store";

type CareerDashboardOverviewProps = {
  targetRole?: string | undefined;
  skillReady: number;
  skillTotal: number;
  summary?: string | null | undefined;
  loading?: boolean;
};

export function CareerDashboardOverview({
  targetRole,
  skillReady,
  skillTotal,
  summary,
  loading = false,
}: CareerDashboardOverviewProps) {
  const readinessScore = useCareerIntelStore((s) => s.readinessScore);
  const interviewReadiness = useCareerIntelStore((s) => s.interviewReadiness);
  const placementReadiness = useCareerIntelStore((s) => s.placementReadiness);
  const goals = useCareerIntelStore((s) => s.goals);
  const toggleGoal = useCareerIntelStore((s) => s.toggleGoal);
  const growthSeries = useCareerIntelStore((s) => s.growthSeries);
  const jobs = useCareerIntelStore((s) => s.jobs);

  const recommendations = [
    {
      title: "Practice a mock interview",
      href: CAREER_INTEL_ROUTES.interview,
      detail: "Build confidence with AI feedback",
    },
    {
      title: "Review matched jobs",
      href: CAREER_INTEL_ROUTES.jobs,
      detail: `${jobs.filter((job) => job.status === "recommended").length} roles ready to explore`,
    },
    {
      title: "Improve your resume",
      href: CAREER_INTEL_ROUTES.resume,
      detail: "Raise ATS score with targeted edits",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="bg-muted h-3 w-24 rounded" />
                <div className="bg-muted h-8 w-16 rounded" />
              </CardHeader>
            </Card>
          ))
        ) : (
          <>
            <SmartStatCard
              label="Career readiness"
              value={`${readinessScore}%`}
              hint="overall score"
            />
            <SmartStatCard
              label="Skill coverage"
              value={`${skillReady}/${skillTotal}`}
              hint={targetRole || "set a target role"}
            />
            <SmartStatCard
              label="Interview readiness"
              value={`${interviewReadiness}%`}
              hint="from mock sessions"
            />
            <SmartStatCard
              label="Placement readiness"
              value={`${placementReadiness}%`}
              hint="applications + match"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>AI career summary</CardTitle>
            <CardDescription>
              Personalized snapshot for your current path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {summary ||
                `You are building toward ${targetRole || "your target role"} with ${skillReady} of ${skillTotal} critical skills ready. Focus on mock interviews and matched applications this week.`}
            </p>
            <ProgressBar value={readinessScore} label="Readiness trajectory" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personalized recommendations</CardTitle>
            <CardDescription>Next best actions from AI Career Intel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full flex-col items-start gap-0.5 px-4 py-3 text-left",
                )}
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-muted-foreground text-xs">{item.detail}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Career goals</CardTitle>
            <CardDescription>Track weekly placement goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={cn(
                  "border-border flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                  goal.done ? "bg-muted/50" : "hover:bg-muted/30",
                )}
                aria-pressed={goal.done}
              >
                <span
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded-full border",
                    goal.done
                      ? "bg-primary border-transparent"
                      : "border-border",
                  )}
                  aria-hidden="true"
                />
                <span>
                  <span
                    className={cn("block", goal.done && "line-through opacity-70")}
                  >
                    {goal.label}
                  </span>
                  {goal.due ? (
                    <span className="text-muted-foreground text-xs">
                      {goal.due}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Career progress</CardTitle>
            <CardDescription>Readiness trend over recent weeks.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              values={growthSeries}
              labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7"]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
