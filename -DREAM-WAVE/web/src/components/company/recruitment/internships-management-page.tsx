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
import { LISTING_STATUS_LABELS, type RecruitmentInternship } from "@/types/recruitment";

const EMPTY_FORM = {
  title: "",
  department: "",
  duration: "",
  location: "",
  stipend: 0,
  requiredSkills: "",
  mentorName: "",
};

export function InternshipsManagementPage() {
  const { token } = useAuth();
  const [internships, setInternships] = useState<RecruitmentInternship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.listInternships(token);
      setInternships(res.internships);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load internships");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInternship() {
    if (!token || !form.title.trim()) return;
    setCreating(true);
    try {
      await recruitmentApi.createInternship(token, {
        ...form,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        workMode: "hybrid",
        status: "draft",
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create internship");
    } finally {
      setCreating(false);
    }
  }

  async function internAction(id: string, action: string) {
    if (!token) return;
    try {
      await recruitmentApi.transitionInternship(token, id, action);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (loading) return <RouteLoading label="Loading internships" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment Workspace" title="Internship Management" description="Manage internship programs with duration, stipend, and mentor details." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader><CardTitle>Create internship</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <input className="form-control" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="form-control" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="form-control" placeholder="Duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          <input className="form-control" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="form-control" type="number" placeholder="Stipend" value={form.stipend || ""} onChange={(e) => setForm({ ...form, stipend: Number(e.target.value) })} />
          <input className="form-control" placeholder="Mentor name" value={form.mentorName} onChange={(e) => setForm({ ...form, mentorName: e.target.value })} />
          <input className="form-control sm:col-span-2" placeholder="Required skills (comma-separated)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          <Button onClick={() => void createInternship()} disabled={creating || !form.title.trim()} className="w-fit">
            <Plus aria-hidden="true" /> Create draft
          </Button>
        </CardContent>
      </Card>

      {!internships.length ? (
        <EmptyState title="No internships yet" description="Create your first internship posting above." />
      ) : (
        <div className="space-y-3">
          {internships.map((item) => {
            const id = item.id || item._id || "";
            return (
              <Card key={id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-muted-foreground text-sm">{item.department || "—"} · {item.duration || "—"} · {LISTING_STATUS_LABELS[item.status] || item.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "draft" ? (
                      <Button size="sm" onClick={() => void internAction(id, "publish")}>Publish</Button>
                    ) : null}
                    {["published", "open"].includes(item.status) ? (
                      <Button size="sm" variant="outline" onClick={() => void internAction(id, "close")}>Close</Button>
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
