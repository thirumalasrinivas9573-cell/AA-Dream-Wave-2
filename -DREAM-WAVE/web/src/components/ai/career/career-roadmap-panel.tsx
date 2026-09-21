"use client";

import Link from "next/link";

import { ProgressBar } from "@/components/dashboard/dashboard-ui";
import { Badge } from "@/components/ui/badge";
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

type SkillGap = { skill: string; owned: boolean; score: number };

export function CareerRoadmapPanel({
  skillGaps,
  certifications,
  pathSteps,
}: {
  skillGaps: SkillGap[];
  certifications: string[];
  pathSteps: string[];
}) {
  const milestones = useCareerIntelStore((s) => s.milestones);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Interactive career roadmap
            </h2>
            <p className="text-muted-foreground text-sm">
              Milestones, skill timeline, and progress toward placement.
            </p>
          </div>
          <Link
            href={CAREER_INTEL_ROUTES.roadmap}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-9")}
          >
            Open AI roadmap
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {milestones.map((item) => (
            <Card
              key={item.id}
              className="transition-transform hover:-translate-y-0.5"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant={item.progress >= 100 ? "default" : "outline"}>
                    {item.progress}%
                  </Badge>
                </div>
                <CardDescription>{item.detail}</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar value={item.progress} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill timeline</CardTitle>
            <CardDescription>
              Missing skills and readiness signals for your target role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skillGaps.map((item) => (
              <div key={item.skill}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{item.skill}</span>
                  <span className="text-muted-foreground">
                    {item.owned ? "Ready" : "Missing"}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={
                      item.owned
                        ? "bg-primary h-full rounded-full"
                        : "h-full rounded-full bg-amber-500/80"
                    }
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning & certification recommendations</CardTitle>
            <CardDescription>
              Suggested next learning moves and credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2">
              {pathSteps.map((step, index) => (
                <li
                  key={step}
                  className="border-border flex gap-3 rounded-xl border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground font-medium">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-2">
              {certifications.map((cert) => (
                <div
                  key={cert}
                  className="border-border rounded-xl border px-3 py-2 text-sm"
                >
                  {cert}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
