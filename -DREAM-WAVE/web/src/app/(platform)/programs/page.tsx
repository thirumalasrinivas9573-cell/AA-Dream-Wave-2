"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { ecosystemIntelligenceApi } from "@/lib/api/ecosystem-intelligence";
import { studentProgramsApi } from "@/lib/api/institution-programs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StudentEcosystemSummary } from "@/types/ecosystem-intelligence";
import type { DiscoverableProgram } from "@/types/institution-program";

export default function StudentProgramsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<DiscoverableProgram[]>([]);
  const [myPrograms, setMyPrograms] = useState<
    Array<{ participant: { status: string }; program: { id: string; title: string } | null }>
  >([]);
  const [ecosystem, setEcosystem] = useState<StudentEcosystemSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"discover" | "my">("discover");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      studentProgramsApi.discover(token),
      studentProgramsApi.myPrograms(token),
      ecosystemIntelligenceApi.getStudentSummary(token).catch(() => null),
    ])
      .then(([disc, mine, eco]) => {
        setPrograms(disc.programs);
        setMyPrograms(mine.programs);
        setEcosystem(eco?.summary ?? null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load programs");
        setLoading(false);
      });
  }, [token]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading programs" />;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave</p>
        <h1 className="text-2xl font-semibold">My Programs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Discover eligible industry programs, track progress, and connect activities to your career journey.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {ecosystem ? (
        <Card className="from-primary/5 border-primary/20 bg-gradient-to-br">
          <CardHeader>
            <CardTitle className="text-base">Ecosystem recommendations</CardTitle>
            <CardDescription>
              {ecosystem.hasInstitutionLink
                ? `${ecosystem.discoverablePrograms ?? 0} eligible programs · ${ecosystem.opportunityMatches ?? 0} opportunity matches`
                : ecosystem.note}
            </CardDescription>
          </CardHeader>
          {ecosystem.recommendations?.length ? (
            <CardContent className="grid gap-3 md:grid-cols-2">
              {ecosystem.recommendations.map((rec, i) => (
                <div key={`${rec.type}-${i}`} className="border-border rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{rec.title}</p>
                    <Badge variant="outline">{rec.type}</Badge>
                  </div>
                  <p className="text-muted-foreground">{rec.why}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Source: {rec.source}</p>
                  {rec.href ? (
                    <Link href={rec.href} className="text-primary mt-2 inline-block text-xs hover:underline">
                      View →
                    </Link>
                  ) : null}
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button variant={tab === "discover" ? "default" : "outline"} size="sm" onClick={() => setTab("discover")}>
          Discover
        </Button>
        <Button variant={tab === "my" ? "default" : "outline"} size="sm" onClick={() => setTab("my")}>
          My programs
        </Button>
      </div>

      {tab === "discover" ? (
        programs.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription>{p.programType.replace(/_/g, " ")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Badge variant="outline">{p.status.replace(/_/g, " ")}</Badge>
                  {p.eligibility ? (
                    <p className="text-muted-foreground">
                      Eligibility: {p.eligibility.status.replace(/_/g, " ")}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Link href={`/programs/${p.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      View
                    </Link>
                    {p.status === "registration_open" && p.eligibility?.eligible && !p.participantStatus && token ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          void studentProgramsApi.register(token, p.id).then(() => window.location.reload())
                        }
                      >
                        Register
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No programs available" description="Published programs matching your eligibility will appear here." />
        )
      ) : myPrograms.length ? (
        <ul className="space-y-3">
          {myPrograms.map(({ participant, program }) =>
            program ? (
              <li key={program.id}>
                <Link href={`/programs/${program.id}`} className="border-border block rounded-lg border p-4 hover:bg-muted/50">
                  <p className="font-medium">{program.title}</p>
                  <p className="text-muted-foreground text-sm">{participant.status.replace(/_/g, " ")}</p>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <EmptyState title="No enrolled programs" description="Register for a program from the Discover tab." />
      )}
    </div>
  );
}

