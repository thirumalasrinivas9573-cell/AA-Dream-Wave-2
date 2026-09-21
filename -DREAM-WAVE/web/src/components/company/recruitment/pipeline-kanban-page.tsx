"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import {
  candidateName,
  formatDate,
  StageBadge,
} from "@/components/company/recruitment/recruitment-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { useRecruitmentStore } from "@/store/recruitment-store";
import { KANBAN_COLUMNS, STAGE_LABELS, type ApplicationStage } from "@/types/recruitment";

export function PipelineKanbanPage() {
  const { token } = useAuth();
  const fetchApplications = useRecruitmentStore((s) => s.fetchApplications);
  const transitionStage = useRecruitmentStore((s) => s.transitionStage);
  const applications = useRecruitmentStore((s) => s.applications);
  const loading = useRecruitmentStore((s) => s.loading);
  const error = useRecruitmentStore((s) => s.error);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) void fetchApplications(token, { limit: "100" });
  }, [token, fetchApplications]);

  const byStage = useMemo(() => {
    const map = new Map<string, typeof applications>();
    for (const col of KANBAN_COLUMNS) map.set(col, []);
    for (const app of applications) {
      const list = map.get(app.stage) || [];
      list.push(app);
      map.set(app.stage, list);
    }
    return map;
  }, [applications]);

  async function handleDrop(targetStage: ApplicationStage) {
    if (!token || !draggingId) return;
    const app = applications.find((a) => a.id === draggingId);
    if (!app || app.stage === targetStage) {
      setDraggingId(null);
      return;
    }
    const ok = await transitionStage(token, draggingId, targetStage);
    if (ok) await fetchApplications(token, { limit: "100" });
    setDraggingId(null);
  }

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader
        eyebrow="Company ATS"
        title="Recruitment Pipeline"
        description="Drag candidates between stages. All moves are validated by the server."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {loading ? <RouteLoading label="Loading pipeline" /> : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((stage) => (
          <div
            key={stage}
            className="bg-muted/30 min-w-[240px] shrink-0 rounded-xl border p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(stage)}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
              <Badge variant="secondary">{(byStage.get(stage) || []).length}</Badge>
            </div>
            <div className="space-y-2">
              {(byStage.get(stage) || []).map((app) => (
                <Card
                  key={app.id}
                  draggable
                  onDragStart={() => setDraggingId(app.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{candidateName(app)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0 text-xs">
                    <p>{app.roleTitle}</p>
                    {app.institutionName ? <p className="text-muted-foreground">{app.institutionName}</p> : null}
                    <p className="text-muted-foreground">{formatDate(app.createdAt)}</p>
                    <StageBadge stage={app.stage} />
                    <Link
                      href={COMPANY_ROUTES.applicationDetail(app.id)}
                      className="text-primary block font-medium hover:underline"
                    >
                      View
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
