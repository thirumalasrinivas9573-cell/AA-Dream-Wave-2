"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { PartnershipRequestDialog } from "@/components/institution/partnerships/partnership-dialogs";
import {
  getOrgId,
  getPartnershipId,
  InstitutionPartnerCard,
  NetworkEmptyState,
  PartnershipMetricGrid,
} from "@/components/institution/partnerships/partnership-ui";
import { InstitutionPageHeader, DataToolbar } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPANY_ROUTES } from "@/constants/partnership";
import { RELATIONSHIP_TYPES } from "@/types/partnership";
import { usePartnershipStore } from "@/store/partnership-store";
import type { DiscoverableInstitution, OrgSummary, Partnership } from "@/types/partnership";

export function InstitutionNetworkPage() {
  const { token } = useAuth();
  const fetchAll = usePartnershipStore((s) => s.fetchAll);
  const fetchCollaborationDashboard = usePartnershipStore((s) => s.fetchCollaborationDashboard);
  const collaborationDashboard = usePartnershipStore((s) => s.collaborationDashboard);
  const fetchPartnerships = usePartnershipStore((s) => s.fetchPartnerships);
  const searchInstitutions = usePartnershipStore((s) => s.searchInstitutions);
  const hydrated = usePartnershipStore((s) => s.hydrated);
  const loading = usePartnershipStore((s) => s.loading);
  const error = usePartnershipStore((s) => s.error);
  const stats = usePartnershipStore((s) => s.stats);
  const partnerships = usePartnershipStore((s) => s.partnerships);
  const discoveredInstitutions = usePartnershipStore((s) => s.discoveredInstitutions);

  const [tab, setTab] = useState<"partners" | "discover" | "pending">("partners");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [requestTarget, setRequestTarget] = useState<DiscoverableInstitution | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (token) {
      void fetchAll(token);
      void fetchCollaborationDashboard(token);
    }
  }, [token, fetchAll, fetchCollaborationDashboard]);

  useEffect(() => {
    if (!token) return;
    if (tab === "discover") {
      void searchInstitutions(token, {
        q: search || undefined,
        location: locationFilter,
        page: String(page),
      });
    } else {
      void fetchPartnerships(token, {
        status: statusFilter,
        relationshipType: typeFilter,
        requestStatus: tab === "pending" ? "pending" : undefined,
        page: String(page),
      });
    }
  }, [token, tab, search, statusFilter, typeFilter, locationFilter, page, searchInstitutions, fetchPartnerships]);

  const partnershipByInstitutionId = useMemo(() => {
    const map = new Map<string, Partnership>();
    for (const p of partnerships) {
      const inst = typeof p.institutionId === "object" ? p.institutionId : p.institution;
      const id = inst && typeof inst === "object" ? getOrgId(inst) : String(p.institutionId);
      map.set(id, p);
    }
    return map;
  }, [partnerships]);

  const activePartners = useMemo(
    () => partnerships.filter((p) => p.status === "active"),
    [partnerships],
  );

  const pendingIncoming = useMemo(
    () =>
      partnerships.filter(
        (p) => p.requestStatus === "pending" && p.initiatedBy === "institution",
      ),
    [partnerships],
  );

  if (!token) return <RouteLoading label="Authenticating" />;
  if (!hydrated && loading) return <RouteLoading label="Loading institution network" />;

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Company platform"
        title="Institution Network"
        description="Discover partner institutions, manage partnerships, and prepare campus recruitment collaboration."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {stats ? <PartnershipMetricGrid stats={stats} variant="company" /> : null}

      {collaborationDashboard ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Collaboration</CardTitle>
              <CardDescription>Active partners and pending requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Active partners:</span>{" "}
                {collaborationDashboard.counts.active}
              </p>
              <p>
                <span className="text-muted-foreground">Incoming requests:</span>{" "}
                {collaborationDashboard.counts.pendingIncoming}
              </p>
              <p>
                <span className="text-muted-foreground">Outgoing requests:</span>{" "}
                {collaborationDashboard.counts.pendingOutgoing}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["partners", "Partner Institutions"],
            ["discover", "Discover Institutions"],
            ["pending", `Pending Requests (${pendingIncoming.length})`],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTab(id);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <DataToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder={
          tab === "discover" ? "Search institutions…" : "Filter partners…"
        }
        filter={tab === "discover" ? locationFilter : statusFilter}
        filterOptions={
          tab === "discover"
            ? [
                { value: "all", label: "All locations" },
                { value: "Hyderabad", label: "Hyderabad" },
                { value: "Bengaluru", label: "Bengaluru" },
                { value: "India", label: "India" },
              ]
            : [
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending" },
              ]
        }
        onFilterChange={(value) => {
          if (tab === "discover") setLocationFilter(value);
          else setStatusFilter(value);
          setPage(1);
        }}
      >
        {tab !== "discover" ? (
          <select
            className="form-control sm:max-w-[220px]"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Partnership type"
          >
            <option value="all">All partnership types</option>
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        ) : null}
      </DataToolbar>

      {loading ? <RouteLoading label="Loading" /> : null}

      {!loading && tab === "partners" && activePartners.length === 0 ? (
        <NetworkEmptyState
          title="No partner institutions yet"
          description="Discover institutions and initiate partnerships for campus recruitment and internships."
        />
      ) : null}

      {!loading && tab === "pending" && pendingIncoming.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="Institution partnership requests will appear here for review."
        />
      ) : null}

      {!loading && tab === "discover" && discoveredInstitutions.length === 0 ? (
        <NetworkEmptyState
          title="No matching institutions"
          description="Try adjusting your search or filters."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tab === "discover"
          ? discoveredInstitutions.map((institution) => {
              const id = getOrgId(institution);
              const existing = partnershipByInstitutionId.get(id);
              return (
                <InstitutionPartnerCard
                  key={id}
                  institution={institution as OrgSummary}
                  partnership={existing}
                  partnershipHref={
                    existing
                      ? COMPANY_ROUTES.partnershipDetail(getPartnershipId(existing))
                      : undefined
                  }
                  onRequest={existing ? undefined : () => setRequestTarget(institution)}
                />
              );
            })
          : (tab === "pending" ? pendingIncoming : activePartners).map((partnership) => {
              const institution = (typeof partnership.institutionId === "object"
                ? partnership.institutionId
                : partnership.institution) as OrgSummary;
              return (
                <InstitutionPartnerCard
                  key={getPartnershipId(partnership)}
                  institution={institution}
                  partnership={partnership}
                  partnershipHref={COMPANY_ROUTES.partnershipDetail(
                    getPartnershipId(partnership),
                  )}
                />
              );
            })}
      </div>

      {requestTarget && token ? (
        <PartnershipRequestDialog
          open={Boolean(requestTarget)}
          onOpenChange={(open) => !open && setRequestTarget(null)}
          targetInstitution={requestTarget}
          token={token}
          initiatorRole="company"
        />
      ) : null}
    </div>
  );
}
