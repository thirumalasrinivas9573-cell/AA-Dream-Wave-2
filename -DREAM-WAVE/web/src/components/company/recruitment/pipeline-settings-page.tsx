"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { PipelineStage } from "@/types/recruitment";

export function PipelineSettingsPage() {
  const { token } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.getPipeline(token);
      setStages(res.pipeline.stages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await recruitmentApi.updatePipeline(token, stages);
      setStages(res.pipeline.stages);
      setSuccess("Pipeline configuration saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RouteLoading label="Loading pipeline settings" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader
        eyebrow="Recruitment Workspace"
        title="Pipeline Configuration"
        description="Customize stage labels and visibility for your recruitment kanban."
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            <Save aria-hidden="true" />
            {saving ? "Saving…" : "Save pipeline"}
          </Button>
        }
      />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>Enable stages and customize labels. Stage transitions remain validated server-side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.key} className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={stage.enabled}
                onChange={(e) =>
                  setStages((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, enabled: e.target.checked } : s)),
                  )
                }
                aria-label={`Enable ${stage.key}`}
              />
              <span className="text-muted-foreground w-28 text-xs font-mono">{stage.key}</span>
              <input
                className="form-control min-w-0 flex-1"
                value={stage.label}
                onChange={(e) =>
                  setStages((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)),
                  )
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
