"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { StageBadge } from "@/components/company/recruitment/recruitment-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { recruitmentApi } from "@/lib/api/recruitment";
import type { ApplicantDirectoryEntry } from "@/types/recruitment";

export function ApplicantDirectoryPage() {
  const { token } = useAuth();
  const [applicants, setApplicants] = useState<ApplicantDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await recruitmentApi.listApplicants(token, { q: search || undefined, limit: 50 });
      setApplicants(res.applicants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applicants");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !applicants.length) return <RouteLoading label="Loading applicant directory" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment Workspace" title="Applicant Directory" description="Candidate-centric view with application history across all roles." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}

      <input className="form-control max-w-md" placeholder="Search by name, email, or role…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {!applicants.length ? (
        <EmptyState title="No applicants found" description="Applications will appear here as candidates apply." />
      ) : (
        <Card>
          <CardHeader><CardTitle>{applicants.length} candidates</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Candidate</th>
                  <th className="p-2">Applications</th>
                  <th className="p-2">Latest stage</th>
                  <th className="p-2">Roles applied</th>
                  <th className="p-2">Resume</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-muted-foreground text-xs">{a.email}</p>
                    </td>
                    <td className="p-2">{a.applicationCount}</td>
                    <td className="p-2"><StageBadge stage={a.latestStage} /></td>
                    <td className="p-2">{a.roles.slice(0, 2).join(", ")}{a.roles.length > 2 ? "…" : ""}</td>
                    <td className="p-2">
                      {a.resumeUrl ? (
                        <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="text-primary underline">Preview</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-sm">
        View individual applications in{" "}
        <Link href={COMPANY_ROUTES.applications} className="text-primary underline">Applications</Link>.
      </p>
    </div>
  );
}
