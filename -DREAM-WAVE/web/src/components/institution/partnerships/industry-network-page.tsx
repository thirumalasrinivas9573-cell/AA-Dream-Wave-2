"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader, DataToolbar } from "@/components/institution/institution-ui";
import { PartnershipRequestDialog } from "@/components/institution/partnerships/partnership-dialogs";
import {
  CompanyPartnerCard,
  getOrgId,
  getPartnershipId,
  NetworkEmptyState,
  PartnershipMetricGrid,
} from "@/components/institution/partnerships/partnership-ui";
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
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { RELATIONSHIP_TYPES } from "@/types/partnership";
import { usePartnershipStore } from "@/store/partnership-store";
import type { DiscoverableCompany, OrgSummary, Partnership } from "@/types/partnership";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "declined", label: "Declined" },
];

export function IndustryNetworkPage() {
  const { token } = useAuth();
  const fetchAll = usePartnershipStore((s) => s.fetchAll);
  const fetchCollaborationDashboard = usePartnershipStore((s) => s.fetchCollaborationDashboard);
  const collaborationDashboard = usePartnershipStore((s) => s.collaborationDashboard);
  const fetchPartnerships = usePartnershipStore((s) => s.fetchPartnerships);
  const searchCompanies = usePartnershipStore((s) => s.searchCompanies);
  const hydrated = usePartnershipStore((s) => s.hydrated);
  const loading = usePartnershipStore((s) => s.loading);
  const error = usePartnershipStore((s) => s.error);
  const stats = usePartnershipStore((s) => s.stats);
  const partnerships = usePartnershipStore((s) => s.partnerships);
  const discoveredCompanies = usePartnershipStore((s) => s.discoveredCompanies);

  const [tab, setTab] = useState<"partners" | "discover" | "pending">("partners");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [requestTarget, setRequestTarget] = useState<DiscoverableCompany | null>(null);
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
      void searchCompanies(token, {
        q: search || undefined,
        industry: industryFilter,
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
  }, [token, tab, search, statusFilter, typeFilter, industryFilter, page, searchCompanies, fetchPartnerships]);

  const partnershipByCompanyId = useMemo(() => {
    const map = new Map<string, Partnership>();
    for (const p of partnerships) {
      const company = typeof p.companyId === "object" ? p.companyId : p.company;
      const id = company && typeof company === "object" ? getOrgId(company) : String(p.companyId);
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
        (p) => p.requestStatus === "pending" && p.initiatedBy === "company",
      ),
    [partnerships],
  );

  if (!token) {
    return <RouteLoading label="Authenticating" />;
  }

  if (!hydrated && loading) {
    return <RouteLoading label="Loading industry network" />;
  }

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Institution platform"
        title="Industry Network"
        description="Discover companies, manage partnerships, and collaborate on recruitment, internships, and industry programs."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {stats ? <PartnershipMetricGrid stats={stats} variant="institution" /> : null}

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
            ["partners", "Partner Network"],
            ["discover", "Discover Companies"],
            ["pending", `Pending Invitations (${pendingIncoming.length})`],
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
          tab === "discover" ? "Search companies…" : "Filter partners…"
        }
        filter={tab === "discover" ? industryFilter : statusFilter}
        filterOptions={
          tab === "discover"
            ? [
                { value: "all", label: "All industries" },
                { value: "Technology", label: "Technology" },
                { value: "Finance", label: "Finance" },
                { value: "Healthcare", label: "Healthcare" },
              ]
            : STATUS_FILTERS
        }
        onFilterChange={(value) => {
          if (tab === "discover") setIndustryFilter(value);
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
          title="No partners yet"
          description="Discover companies and send partnership requests to build your industry network."
        />
      ) : null}

      {!loading && tab === "pending" && pendingIncoming.length === 0 ? (
        <EmptyState
          title="No pending invitations"
          description="When companies invite your institution, requests will appear here."
        />
      ) : null}

      {!loading && tab === "discover" && discoveredCompanies.length === 0 ? (
        <NetworkEmptyState
          title="No matching companies"
          description="Try adjusting your search or filters to discover industry partners."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tab === "discover"
          ? discoveredCompanies.map((company) => {
              const id = getOrgId(company);
              const existing = partnershipByCompanyId.get(id);
              return (
                <CompanyPartnerCard
                  key={id}
                  company={company as OrgSummary}
                  partnership={existing}
                  partnershipHref={
                    existing
                      ? INSTITUTION_ROUTES.partnershipDetail(getPartnershipId(existing))
                      : undefined
                  }
                  onRequest={existing ? undefined : () => setRequestTarget(company)}
                />
              );
            })
          : (tab === "pending" ? pendingIncoming : activePartners).map((partnership) => {
              const company = (typeof partnership.companyId === "object"
                ? partnership.companyId
                : partnership.company) as OrgSummary;
              return (
                <CompanyPartnerCard
                  key={getPartnershipId(partnership)}
                  company={company}
                  partnership={partnership}
                  partnershipHref={INSTITUTION_ROUTES.partnershipDetail(
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
          targetCompany={requestTarget}
          token={token}
          initiatorRole="institution"
        />
      ) : null}
    </div>
  );
}
