"use client";

import { Building2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { CompanyProfile } from "@/types/recruitment";

export function CompanyProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await recruitmentApi.getProfile(token);
      setProfile(res.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!token || !profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await recruitmentApi.updateProfile(token, profile);
      setProfile(res.profile);
      setSuccess("Company profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RouteLoading label="Loading company profile" />;
  if (!profile) return null;

  function update(field: keyof CompanyProfile, value: string) {
    setProfile((p) => (p ? { ...p, [field]: value } : p));
  }

  return (
    <div className="space-y-6">
      <InstitutionPageHeader
        eyebrow="Company Workspace"
        title="Company Profile"
        description="Manage your organization profile, hiring locations, and recruiter contacts."
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            <Save aria-hidden="true" />
            {saving ? "Saving…" : "Save profile"}
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
            <Building2 className="size-5" />
          </span>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>Used across recruitment listings and institution partnerships.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Company name</span>
            <input className="form-control w-full" value={profile.name} onChange={(e) => update("name", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Industry</span>
            <input className="form-control w-full" value={profile.industry || ""} onChange={(e) => update("industry", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Company size</span>
            <input className="form-control w-full" value={profile.companySize || ""} onChange={(e) => update("companySize", e.target.value)} placeholder="e.g. 100-500" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Headquarters</span>
            <input className="form-control w-full" value={profile.headquarters || ""} onChange={(e) => update("headquarters", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Website</span>
            <input className="form-control w-full" value={profile.website || ""} onChange={(e) => update("website", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Careers page</span>
            <input className="form-control w-full" value={profile.careersPageUrl || ""} onChange={(e) => update("careersPageUrl", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Description</span>
            <textarea className="form-control min-h-28 w-full" value={profile.description || ""} onChange={(e) => update("description", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Hiring departments (comma-separated)</span>
            <input
              className="form-control w-full"
              value={(profile.hiringDepartments || []).join(", ")}
              onChange={(e) =>
                setProfile((p) =>
                  p ? { ...p, hiringDepartments: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : p,
                )
              }
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Active listings</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{profile.activeJobsCount ?? 0} jobs · {profile.activeInternshipsCount ?? 0} internships</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="capitalize">{profile.status || "active"}{profile.verified ? " · Verified" : ""}</CardContent>
        </Card>
      </div>
    </div>
  );
}
