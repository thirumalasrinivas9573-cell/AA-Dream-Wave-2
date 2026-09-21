"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import {
  candidateName,
  formatDate,
  StageBadge,
} from "@/components/company/recruitment/recruitment-ui";
import { DataToolbar, InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { APPLICATION_STAGES } from "@/types/recruitment";
import { useRecruitmentStore } from "@/store/recruitment-store";

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ApplicationListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchApplications = useRecruitmentStore((s) => s.fetchApplications);
  const bulkTransition = useRecruitmentStore((s) => s.bulkTransition);
  const applications = useRecruitmentStore((s) => s.applications);
  const loading = useRecruitmentStore((s) => s.loading);
  const error = useRecruitmentStore((s) => s.error);
  const pagination = useRecruitmentStore((s) => s.pagination);

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [stageFilter, setStageFilter] = useState(searchParams.get("stage") || "all");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search);

  const syncUrl = useCallback(
    (q: string, stage: string, p: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (stage && stage !== "all") params.set("stage", stage);
      if (p > 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(`${COMPANY_ROUTES.applications}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (!token) return;
    syncUrl(debouncedSearch, stageFilter, page);
    void fetchApplications(token, {
      q: debouncedSearch || undefined,
      stage: stageFilter,
      page: String(page),
      limit: "20",
      sort: "updated",
    });
  }, [token, debouncedSearch, stageFilter, page, fetchApplications, syncUrl]);

  const allSelected = useMemo(
    () => applications.length > 0 && applications.every((a) => selected.has(a.id)),
    [applications, selected],
  );

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(applications.map((a) => a.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="space-y-6">
      <InstitutionPageHeader
        eyebrow="Company ATS"
        title="Applications"
        description="Search, filter, and manage candidate applications."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <DataToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search candidate or role…"
        filter={stageFilter}
        filterOptions={[
          { value: "all", label: "All stages" },
          ...APPLICATION_STAGES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
        ]}
        onFilterChange={(v) => {
          setStageFilter(v);
          setPage(1);
        }}
      >
        {selected.size > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!token) return;
              void bulkTransition(token, [...selected], "under_review");
              setSelected(new Set());
            }}
          >
            Bulk move to review ({selected.size})
          </Button>
        ) : null}
      </DataToolbar>

      {loading ? <RouteLoading label="Loading applications" /> : null}

      {!loading && applications.length === 0 ? (
        <EmptyState title="No applicants yet" description="Applications will appear here when candidates apply." />
      ) : null}

      {!loading && applications.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => toggleAll(Boolean(c))}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(app.id)}
                      onCheckedChange={(c) => toggleOne(app.id, Boolean(c))}
                      aria-label={`Select ${candidateName(app)}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{candidateName(app)}</TableCell>
                  <TableCell>{app.roleTitle}</TableCell>
                  <TableCell>{app.institutionName || "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">
                    {app.skillsSummary || app.candidateSnapshot.skills?.slice(0, 3).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{formatDate(app.createdAt)}</TableCell>
                  <TableCell>
                    <StageBadge stage={app.stage} />
                  </TableCell>
                  <TableCell>{app.assignedRecruiterUserId ? "Assigned" : "—"}</TableCell>
                  <TableCell>{formatDate(app.updatedAt)}</TableCell>
                  <TableCell>
                    <Link
                      href={COMPANY_ROUTES.applicationDetail(app.id)}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {pagination.pageCount > 1 ? (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground self-center text-sm">
            Page {page} of {pagination.pageCount} ({pagination.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
