"use client";

import { MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { ActivityTimeline } from "@/components/dashboard/dashboard-ui";
import { PartnershipRespondDialog } from "@/components/institution/partnerships/partnership-dialogs";
import {
  OrgLogo,
  PartnershipStatusBadge,
  resolveOrgFromPartnership,
} from "@/components/institution/partnerships/partnership-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { partnershipsApi } from "@/lib/api/partnerships";
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
import { DOCUMENT_TYPES, type SharingScope } from "@/types/partnership";
import { usePartnershipStore } from "@/store/partnership-store";

const WORKSPACE_TABS = [
  "Overview",
  "Recruitment",
  "Internships",
  "Campus Drives",
  "Events",
  "Projects",
  "Documents",
  "Communication",
  "Activity",
] as const;

type PartnershipWorkspaceProps = {
  partnershipId: string;
  portal: "institution" | "company";
  backHref: string;
};

export function PartnershipWorkspace({
  partnershipId,
  portal,
  backHref,
}: PartnershipWorkspaceProps) {
  const { token } = useAuth();
  const fetchPartnership = usePartnershipStore((s) => s.fetchPartnership);
  const updateScope = usePartnershipStore((s) => s.updateScope);
  const pausePartnership = usePartnershipStore((s) => s.pausePartnership);
  const cancelPartnership = usePartnershipStore((s) => s.cancelPartnership);
  const addDocument = usePartnershipStore((s) => s.addDocument);
  const clearCurrent = usePartnershipStore((s) => s.clearCurrent);
  const loading = usePartnershipStore((s) => s.loading);
  const error = usePartnershipStore((s) => s.error);
  const partnership = usePartnershipStore((s) => s.currentPartnership);
  const workspace = usePartnershipStore((s) => s.workspace);
  const activity = usePartnershipStore((s) => s.activity);
  const documents = usePartnershipStore((s) => s.documents);

  const [tab, setTab] = useState<(typeof WORKSPACE_TABS)[number]>("Overview");
  const [respondAction, setRespondAction] = useState<
    "accept" | "decline" | "info_requested" | null
  >(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<string>("MoU");
  const [docUrl, setDocUrl] = useState("");
  const [scopeDraft, setScopeDraft] = useState<SharingScope[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (workspace?.sharingScopes) setScopeDraft(workspace.sharingScopes);
  }, [workspace?.sharingScopes]);

  const loadAiInsight = useCallback(async () => {
    if (!token) return;
    setAiLoading(true);
    try {
      const res = await partnershipsApi.getAiInsights(token, partnershipId, "PARTNERSHIP_SUMMARY");
      const insight = res.insight as { interpretation?: string; observation?: string };
      setAiInsight(insight.interpretation || insight.observation || null);
    } catch {
      setAiInsight(null);
    } finally {
      setAiLoading(false);
    }
  }, [token, partnershipId]);

  useEffect(() => {
    if (token) void fetchPartnership(token, partnershipId);
    return () => clearCurrent();
  }, [token, partnershipId, fetchPartnership, clearCurrent]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !partnership) return <RouteLoading label="Loading partnership" />;

  if (error || !partnership) {
    return (
      <EmptyState
        title="Partnership unavailable"
        description={error || "This partnership could not be loaded."}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            Go back
          </Link>
        }
      />
    );
  }

  const counterparty =
    portal === "institution"
      ? resolveOrgFromPartnership(partnership, "company")
      : resolveOrgFromPartnership(partnership, "institution");

  const canRespond =
    partnership.requestStatus === "pending" &&
    partnership.initiatedBy !== portal;

  const canManage =
    partnership.status === "active" || partnership.status === "paused";

  const scopeAccess = workspace?.scopeAccess;
  const shared = workspace?.shared;

  function toggleScope(scope: SharingScope) {
    setScopeDraft((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function renderResourceList(
    items: Array<{ _id?: string; id?: string; title: string; status?: string; location?: string; department?: string }>,
    emptyTitle: string,
    emptyDescription: string,
  ) {
    if (!items?.length) {
      return (
        <EmptyState title={emptyTitle} description={emptyDescription} titleAs="h3" />
      );
    }
    return (
      <ul className="divide-border divide-y">
        {items.map((item) => (
          <li key={item._id || item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs">
                {[item.department, item.location, item.status].filter(Boolean).join(" · ")}
              </p>
            </div>
            {item.status ? <Badge variant="outline">{item.status}</Badge> : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <InstitutionPageHeader
        eyebrow="Partnership workspace"
        title={counterparty.name}
        description={`${partnership.relationshipType} · ${partnership.status}`}
        actions={
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            Back to network
          </Link>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <OrgLogo
          name={counterparty.name}
          {...(counterparty.logoUrl ? { logoUrl: counterparty.logoUrl } : {})}
        />
        <div className="flex flex-wrap gap-2">
          <PartnershipStatusBadge status={partnership.status} />
          <Badge variant="outline">{partnership.relationshipType}</Badge>
        </div>
        {canRespond ? (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button size="sm" onClick={() => setRespondAction("accept")}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRespondAction("info_requested")}>
              Request info
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRespondAction("decline")}>
              Decline
            </Button>
          </div>
        ) : canManage ? (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {partnership.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => token && void pausePartnership(token, partnershipId)}
              >
                Pause
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => token && void cancelPartnership(token, partnershipId)}
            >
              Cancel partnership
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {WORKSPACE_TABS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? "default" : "outline"}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Partnership overview</CardTitle>
              <CardDescription>Key details and objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Created:</span>{" "}
                {new Date(partnership.createdAt).toLocaleDateString()}
              </p>
              {partnership.startDate ? (
                <p>
                  <span className="text-muted-foreground">Start date:</span>{" "}
                  {new Date(partnership.startDate).toLocaleDateString()}
                </p>
              ) : null}
              {partnership.expectedDuration ? (
                <p>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  {partnership.expectedDuration}
                </p>
              ) : null}
              {partnership.contactPerson?.name ? (
                <p>
                  <span className="text-muted-foreground">Primary contact:</span>{" "}
                  {partnership.contactPerson.name}
                  {partnership.contactPerson.email
                    ? ` (${partnership.contactPerson.email})`
                    : ""}
                </p>
              ) : null}
              {partnership.objectives ? (
                <p>
                  <span className="text-muted-foreground">Objectives:</span>{" "}
                  {partnership.objectives}
                </p>
              ) : null}
              {partnership.description || partnership.message ? (
                <p>{partnership.description || partnership.message}</p>
              ) : null}
              {workspace?.sharingScopes?.length ? (
                <div className="flex flex-wrap gap-1 pt-2">
                  {workspace.sharingScopes.map((scope) => (
                    <Badge key={scope} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" aria-hidden="true" />
                Collaboration insight
              </CardTitle>
              <CardDescription>AI summary from authorized partnership data only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {aiInsight ? <p>{aiInsight}</p> : (
                <p className="text-muted-foreground">Generate a summary of this partnership.</p>
              )}
              <Button size="sm" variant="outline" disabled={aiLoading} onClick={() => void loadAiInsight()}>
                {aiLoading ? "Analyzing…" : "Summarize partnership"}
              </Button>
            </CardContent>
          </Card>
          {partnership.status === "active" && workspace?.availableScopes ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sharing scope</CardTitle>
                <CardDescription>
                  Only enabled areas permit cross-organization access. Student private data is never shared by default.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {workspace.availableScopes.map((scope) => {
                    const enabled = scopeDraft.includes(scope);
                    return (
                      <Button
                        key={scope}
                        size="sm"
                        variant={enabled ? "default" : "outline"}
                        aria-pressed={enabled}
                        onClick={() => toggleScope(scope)}
                      >
                        {scope}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  disabled={!scopeDraft.length}
                  onClick={() => {
                    if (!token || !scopeDraft.length) return;
                    void updateScope(token, partnershipId, scopeDraft);
                  }}
                >
                  Save scope changes
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length ? (
                <ActivityTimeline
                  items={activity.slice(0, 5).map((item) => ({
                    id: item._id,
                    title: item.title,
                    time: new Date(item.createdAt).toLocaleString(),
                    detail: item.description || "",
                  }))}
                />
              ) : (
                <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Recruitment" ? (
        <Card>
          <CardHeader>
            <CardTitle>Shared recruitment</CardTitle>
            <CardDescription>
              Jobs shared through this partnership. Access requires active recruitment scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!scopeAccess?.recruitment ? (
              <EmptyState
                title="Recruitment scope disabled"
                description="Enable the recruitment sharing scope to collaborate on jobs."
                titleAs="h3"
              />
            ) : (
              renderResourceList(
                shared?.jobs || [],
                "No shared jobs",
                "Link company jobs to this partnership from the recruitment module.",
              )
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Internships" ? (
        <Card>
          <CardHeader>
            <CardTitle>Shared internships</CardTitle>
          </CardHeader>
          <CardContent>
            {!scopeAccess?.recruitment ? (
              <EmptyState
                title="Recruitment scope disabled"
                description="Internships require the recruitment sharing scope."
                titleAs="h3"
              />
            ) : (
              renderResourceList(
                shared?.internships || [],
                "No shared internships",
                "Internships linked to this partnership will appear here.",
              )
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Campus Drives" ? (
        <Card>
          <CardHeader>
            <CardTitle>Campus drives</CardTitle>
            <CardDescription>Placement drives shared with {counterparty.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {!scopeAccess?.placement ? (
              <EmptyState
                title="Placement scope disabled"
                description="Enable placement scope for campus drive collaboration."
                titleAs="h3"
              />
            ) : (
              renderResourceList(
                shared?.drives || [],
                "No campus drives",
                "Institution placement drives linked to this partnership appear here.",
              )
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Events" ? (
        <Card>
          <CardHeader>
            <CardTitle>Shared events</CardTitle>
            <CardDescription>Workshops, hackathons, and seminars</CardDescription>
          </CardHeader>
          <CardContent>
            {!scopeAccess?.events ? (
              <EmptyState
                title="Events scope disabled"
                description="Enable the events scope to share campus or industry events."
                titleAs="h3"
              />
            ) : (
              renderResourceList(
                (shared?.events || []).map((e) => ({ id: e.id, title: e.title, status: e.status })),
                "No shared events",
                "Link events to this partnership to collaborate on workshops and hackathons.",
              )
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Projects" ? (
        <Card>
          <CardHeader>
            <CardTitle>Project collaboration</CardTitle>
            <CardDescription>
              Only student projects explicitly permitted by project permissions are shared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!scopeAccess?.projects ? (
              <EmptyState
                title="Projects scope disabled"
                description="Enable projects scope and link approved student projects."
                titleAs="h3"
              />
            ) : (
              <EmptyState
                title="No shared projects"
                description="Private projects are never automatically shared. Link approved projects when ready."
                titleAs="h3"
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Documents" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MoU & agreements</CardTitle>
              <CardDescription>
                Private documents visible only to authorized partnership members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.length ? (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li
                      key={doc._id}
                      className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {doc.type} · {doc.uploadedByRole} ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          View
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No documents yet"
                  description="Upload MoUs, agreements, or NDAs for this partnership."
                  titleAs="h3"
                />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="docName">Document name</Label>
                  <Input id="docName" value={docName} onChange={(e) => setDocName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docType">Type</Label>
                  <select
                    id="docType"
                    className="form-control w-full"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="docUrl">File URL (metadata)</Label>
                  <Input id="docUrl" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!docName || !token) return;
                  void addDocument(token, partnershipId, {
                    name: docName,
                    type: docType,
                    fileUrl: docUrl,
                  }).then(() => {
                    setDocName("");
                    setDocUrl("");
                  });
                }}
              >
                Add document
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Communication" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" aria-hidden="true" />
              Communication
            </CardTitle>
            <CardDescription>
              Use the platform notification center — no separate messaging system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Contact {partnership.contactPerson?.name || counterparty.name} via{" "}
              {partnership.contactPerson?.email || "organization channels"}.
            </p>
            <Link href="/notifications" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Open notification center
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Activity" ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length ? (
              <ActivityTimeline
                items={activity.map((item) => ({
                  id: item._id,
                  title: item.title,
                  time: new Date(item.createdAt).toLocaleString(),
                  detail: item.description || "",
                }))}
              />
            ) : (
              <EmptyState title="No activity yet" description="Partnership events will appear here." titleAs="h3" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {respondAction && token ? (
        <PartnershipRespondDialog
          open={Boolean(respondAction)}
          onOpenChange={(open) => !open && setRespondAction(null)}
          token={token}
          partnershipId={partnershipId}
          action={respondAction}
        />
      ) : null}
    </div>
  );
}
