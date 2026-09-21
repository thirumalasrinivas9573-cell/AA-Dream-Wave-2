"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useInstitutionProgramStore } from "@/store/institution-program-store";
import { PROGRAM_TYPES, type ProgramType } from "@/types/institution-program";

export function ProgramManagementPage() {
  const { token } = useAuth();
  const fetchPrograms = useInstitutionProgramStore((s) => s.fetchPrograms);
  const createProgram = useInstitutionProgramStore((s) => s.createProgram);
  const programs = useInstitutionProgramStore((s) => s.programs);
  const loading = useInstitutionProgramStore((s) => s.loading);
  const error = useInstitutionProgramStore((s) => s.error);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [programType, setProgramType] = useState<ProgramType>("INDUSTRY_WORKSHOP");
  const [objectives, setObjectives] = useState("");

  useEffect(() => {
    if (token) void fetchPrograms(token);
  }, [token, fetchPrograms]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !programs.length) return <RouteLoading label="Loading programs" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Industry Programs"
        description="Structured campus-industry programs connecting partnerships, events, recruitment, and learning."
        actions={
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Close" : "Create program"}
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>New program</CardTitle>
            <CardDescription>Draft programs start in draft status until you plan and open registration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="programTitle">Title</Label>
              <Input id="programTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programType">Type</Label>
              <select
                id="programType"
                className="form-control w-full"
                value={programType}
                onChange={(e) => setProgramType(e.target.value as ProgramType)}
              >
                {PROGRAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="objectives">Objectives</Label>
              <Input id="objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
            </div>
            <Button
              className="sm:col-span-2 w-fit"
              disabled={!title.trim()}
              onClick={() => {
                if (!token || !title.trim()) return;
                void createProgram(token, { title, programType, objectives }).then((p) => {
                  if (p) {
                    setShowCreate(false);
                    setTitle("");
                    setObjectives("");
                  }
                });
              }}
            >
              Create draft
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {programs.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{program.title}</CardTitle>
                  <Badge variant="outline">{program.status.replace(/_/g, " ")}</Badge>
                </div>
                <CardDescription>{program.programType.replace(/_/g, " ")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {program.objectives ? <p className="text-muted-foreground">{program.objectives}</p> : null}
                <Link
                  href={INSTITUTION_ROUTES.programDetail(program.id)}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open workspace
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No programs yet"
          description="Create an industry workshop, campus hiring program, or skill bootcamp to coordinate with partner companies."
        />
      )}
    </div>
  );
}
