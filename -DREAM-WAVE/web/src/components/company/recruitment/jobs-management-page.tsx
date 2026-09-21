"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import { LISTING_STATUS_LABELS, type RecruitmentJob } from "@/types/recruitment";

const EMPTY_FORM = {
  title: "",
  department: "",
  location: "",
  workMode: "hybrid",
  experience: "",
  openings: 1,
  requiredSkills: "",
  hiringManager: "",
};

export function JobsManagementPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.listJobs(token);
      setJobs(res.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createJob() {
    if (!token || !form.title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await recruitmentApi.createJob(token, {
        ...form,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        status: "draft",
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  async function jobAction(id: string, action: string) {
    if (!token) return;
    try {
      await recruitmentApi.transitionJob(token, id, action);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (loading) return <RouteLoading label="Loading jobs" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment Workspace" title="Job Management" description="Create, publish, and manage job postings." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader><CardTitle>Create job posting</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input className="form-control" placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="form-control" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="form-control" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="form-control" placeholder="Experience required" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
          <input className="form-control" placeholder="Required skills (comma-separated)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          <input className="form-control" placeholder="Hiring manager" value={form.hiringManager} onChange={(e) => setForm({ ...form, hiringManager: e.target.value })} />
          <Button onClick={() => void createJob()} disabled={creating || !form.title.trim()} className="sm:col-span-2 w-fit">
            <Plus aria-hidden="true" /> Create draft
          </Button>
        </CardContent>
      </Card>

      {!jobs.length ? (
        <EmptyState title="No jobs yet" description="Create your first job posting above." />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const id = job.id || job._id || "";
            return (
              <Card key={id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-muted-foreground text-sm">{job.department || "—"} · {job.location || "—"} · {LISTING_STATUS_LABELS[job.status] || job.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.status === "draft" ? (
                      <Button size="sm" onClick={() => void jobAction(id, "publish")}>Publish</Button>
                    ) : null}
                    {["published", "open"].includes(job.status) ? (
                      <Button size="sm" variant="outline" onClick={() => void jobAction(id, "close")}>Close</Button>
                    ) : null}
                    {job.status === "closed" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => void jobAction(id, "reopen")}>Reopen</Button>
                        <Button size="sm" variant="outline" onClick={() => void jobAction(id, "archive")}>Archive</Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
