"use client";

import {
  Briefcase,
  FlaskConical,
  Lightbulb,
  Microscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import type { AcademicColumn } from "@/components/institution/academics/academic-table";
import { AcademicTable } from "@/components/institution/academics/academic-table";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import {
  IdeaStatusBadge,
  IdeaTypeBadge,
  OpportunityTypeBadge,
  ProjectStatusBadge,
  formatResearchDate,
} from "@/components/institution/research/research-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { institutionResearchApi } from "@/lib/api/institution-research";
import { useResearchManagementStore } from "@/store/research-management-store";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "opportunities", label: "Opportunities" },
  { id: "applications", label: "Applications" },
  { id: "ideas", label: "Innovation Ideas" },
  { id: "publications", label: "Publications" },
] as const;

type ResearchTab = (typeof TABS)[number]["id"];

export function ResearchManagementPage({ initialTab = "overview" }: { initialTab?: ResearchTab }) {
  const { token } = useAuth();
  const store = useResearchManagementStore();
  const [tab, setTab] = useState<ResearchTab>(initialTab);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showOppForm, setShowOppForm] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);

  const [projectForm, setProjectForm] = useState({
    title: "",
    abstract: "",
    researchArea: "",
    category: "applied",
    domain: "computer_science",
    principalInvestigatorName: "",
    budget: "",
    fundingSource: "",
  });

  const [oppForm, setOppForm] = useState({
    title: "",
    description: "",
    opportunityType: "research_assistant",
    department: "",
    researchArea: "",
  });

  const [ideaForm, setIdeaForm] = useState({
    title: "",
    ideaType: "startup_idea",
    problemStatement: "",
    proposedSolution: "",
    description: "",
  });

  const loadTab = useCallback(async () => {
    if (!token) return;
    if (tab === "overview") await store.fetchWorkspace(token);
    if (tab === "projects") await store.fetchProjects(token);
    if (tab === "opportunities") await store.fetchOpportunities(token);
    if (tab === "applications") await store.fetchApplications(token);
    if (tab === "ideas") await store.fetchIdeas(token);
    if (tab === "publications") await store.fetchPublications(token);
  }, [token, tab, store]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  async function handleCreateProject() {
    if (!token || !projectForm.title) return;
    setDialogError(null);
    try {
      await institutionResearchApi.createProject(token, {
        title: projectForm.title,
        abstract: projectForm.abstract,
        researchArea: projectForm.researchArea,
        category: projectForm.category,
        domain: projectForm.domain,
        budget: projectForm.budget ? Number(projectForm.budget) : 0,
        fundingSource: projectForm.fundingSource,
        principalInvestigator: { name: projectForm.principalInvestigatorName },
      });
      setShowProjectForm(false);
      setProjectForm({ title: "", abstract: "", researchArea: "", category: "applied", domain: "computer_science", principalInvestigatorName: "", budget: "", fundingSource: "" });
      await store.fetchProjects(token);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  async function handleCreateOpportunity() {
    if (!token || !oppForm.title) return;
    setDialogError(null);
    try {
      await institutionResearchApi.createOpportunity(token, oppForm);
      setShowOppForm(false);
      setOppForm({ title: "", description: "", opportunityType: "research_assistant", department: "", researchArea: "" });
      await store.fetchOpportunities(token);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to create opportunity");
    }
  }

  async function handlePublishOpportunity(id: string) {
    if (!token) return;
    await institutionResearchApi.transitionOpportunity(token, id, "publish");
    await store.fetchOpportunities(token);
  }

  async function handleReviewApplication(id: string, status: string) {
    if (!token) return;
    await institutionResearchApi.reviewApplication(token, id, { status });
    await store.fetchApplications(token);
  }

  async function handleSubmitIdea() {
    if (!token || !ideaForm.title) return;
    setDialogError(null);
    try {
      await institutionResearchApi.submitIdea(token, ideaForm);
      setShowIdeaForm(false);
      setIdeaForm({ title: "", ideaType: "startup_idea", problemStatement: "", proposedSolution: "", description: "" });
      await store.fetchIdeas(token);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to submit idea");
    }
  }

  async function handleReviewIdea(id: string, reviewStatus: string) {
    if (!token) return;
    await institutionResearchApi.reviewIdea(token, id, { reviewStatus });
    await store.fetchIdeas(token);
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (!store.hydrated && store.loading) return <RouteLoading label="Loading research workspace" />;

  const stats = store.stats;

  const projectRows = store.projects.map((r) => ({ ...r, id: r._id }));
  const oppRows = store.opportunities.map((r) => ({ ...r, id: r._id }));
  const appRows = store.applications.map((r) => ({ ...r, id: r._id }));
  const ideaRows = store.ideas.map((r) => ({ ...r, id: r._id }));

  const projectColumns: AcademicColumn<(typeof projectRows)[number]>[] = [
    { key: "title", header: "Project", cell: (r) => r.title },
    { key: "area", header: "Area", cell: (r) => r.researchArea || "—" },
    { key: "pi", header: "PI", cell: (r) => r.principalInvestigator?.name || "—" },
    { key: "status", header: "Status", cell: (r) => <ProjectStatusBadge status={r.status} /> },
    { key: "updated", header: "Updated", cell: (r) => formatResearchDate(r.updatedAt) },
  ];

  const oppColumns: AcademicColumn<(typeof oppRows)[number]>[] = [
    { key: "title", header: "Opportunity", cell: (r) => r.title },
    { key: "type", header: "Type", cell: (r) => <OpportunityTypeBadge type={r.opportunityType} /> },
    { key: "dept", header: "Department", cell: (r) => r.department || "—" },
    { key: "status", header: "Status", cell: (r) => <BadgeStatus status={r.status} /> },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "draft" ? (
          <Button size="sm" variant="outline" onClick={() => void handlePublishOpportunity(r._id)}>
            Publish
          </Button>
        ) : null,
    },
  ];

  const appColumns: AcademicColumn<(typeof appRows)[number]>[] = [
    { key: "name", header: "Applicant", cell: (r) => r.applicantName },
    { key: "dept", header: "Department", cell: (r) => r.department || "—" },
    { key: "status", header: "Status", cell: (r) => <BadgeStatus status={r.status} /> },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "submitted" ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => void handleReviewApplication(r._id, "shortlisted")}>
              Shortlist
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleReviewApplication(r._id, "rejected")}>
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  const ideaColumns: AcademicColumn<(typeof ideaRows)[number]>[] = [
    { key: "title", header: "Idea", cell: (r) => r.title },
    { key: "type", header: "Type", cell: (r) => <IdeaTypeBadge type={r.ideaType} /> },
    { key: "submitter", header: "Submitter", cell: (r) => r.submitterName || "—" },
    { key: "status", header: "Status", cell: (r) => <IdeaStatusBadge status={r.reviewStatus} /> },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.reviewStatus === "submitted" ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => void handleReviewIdea(r._id, "under_review")}>
              Review
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleReviewIdea(r._id, "incubating")}>
              Incubate
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Research & Innovation"
        title="Research Management Workspace"
        description="Manage research projects, collaboration teams, opportunities, publications, and innovation ideas."
      />

      {store.error ? <Alert variant="error">{store.error}</Alert> : null}
      {dialogError ? <Alert variant="error">{dialogError}</Alert> : null}

      <nav aria-label="Research sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Management</span>
        <Link href={INSTITUTION_ROUTES.researchAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>
        <Link href={INSTITUTION_ROUTES.researchReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>Reports</Link>
      </nav>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "ghost"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {!stats?.hasData ? (
            <EmptyState
              title="No research data yet"
              description="Create research projects, publish opportunities, or collect innovation ideas to populate this workspace."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InstitutionMetricCard label="Research Projects" value={stats.totalProjects} hint={`${stats.activeProjects} active`} icon={Microscope} />
              <InstitutionMetricCard label="Publications" value={stats.totalPublications} hint="Recorded outcomes" icon={FlaskConical} />
              <InstitutionMetricCard label="Opportunities" value={stats.publishedOpportunities} hint="Published listings" icon={Briefcase} />
              <InstitutionMetricCard label="Innovation Ideas" value={stats.totalIdeas} hint={`${stats.incubatingIdeas} incubating`} icon={Lightbulb} />
              <InstitutionMetricCard label="Applications" value={stats.totalApplications} hint="Opportunity applications" icon={Users} />
              <InstitutionMetricCard label="Pending Ideas" value={stats.pendingIdeas} hint="Awaiting review" icon={Lightbulb} />
            </div>
          )}

          {store.workspace?.recentProjects?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {store.workspace.recentProjects.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-muted-foreground text-sm">{p.researchArea || "—"}</p>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {tab === "projects" && (
        <EntitySection
          title="Research Projects"
          description="Track project lifecycle, team collaboration, outcomes, and history."
          action={
            <Button onClick={() => setShowProjectForm(true)}>New Project</Button>
          }
        >
          {showProjectForm ? (
            <FormCard title="Create Research Project" onCancel={() => setShowProjectForm(false)} onSubmit={() => void handleCreateProject()}>
              <FormField label="Title" value={projectForm.title} onChange={(v) => setProjectForm((s) => ({ ...s, title: v }))} />
              <FormField label="Research Area" value={projectForm.researchArea} onChange={(v) => setProjectForm((s) => ({ ...s, researchArea: v }))} />
              <FormField label="Principal Investigator" value={projectForm.principalInvestigatorName} onChange={(v) => setProjectForm((s) => ({ ...s, principalInvestigatorName: v }))} />
              <FormField label="Abstract" value={projectForm.abstract} onChange={(v) => setProjectForm((s) => ({ ...s, abstract: v }))} multiline />
              <FormField label="Budget (INR)" value={projectForm.budget} onChange={(v) => setProjectForm((s) => ({ ...s, budget: v }))} />
              <FormField label="Funding Source" value={projectForm.fundingSource} onChange={(v) => setProjectForm((s) => ({ ...s, fundingSource: v }))} />
            </FormCard>
          ) : null}
          <AcademicTable columns={projectColumns} rows={projectRows} emptyDescription="No research projects yet." />
        </EntitySection>
      )}

      {tab === "opportunities" && (
        <EntitySection
          title="Research Opportunities"
          description="Publish research assistant positions, innovation challenges, thesis opportunities, and collaborative programs."
          action={<Button onClick={() => setShowOppForm(true)}>New Opportunity</Button>}
        >
          {showOppForm ? (
            <FormCard title="Create Opportunity" onCancel={() => setShowOppForm(false)} onSubmit={() => void handleCreateOpportunity()}>
              <FormField label="Title" value={oppForm.title} onChange={(v) => setOppForm((s) => ({ ...s, title: v }))} />
              <FormField label="Department" value={oppForm.department} onChange={(v) => setOppForm((s) => ({ ...s, department: v }))} />
              <FormField label="Research Area" value={oppForm.researchArea} onChange={(v) => setOppForm((s) => ({ ...s, researchArea: v }))} />
              <FormField label="Description" value={oppForm.description} onChange={(v) => setOppForm((s) => ({ ...s, description: v }))} multiline />
            </FormCard>
          ) : null}
          <AcademicTable columns={oppColumns} rows={oppRows} emptyDescription="No opportunities yet." />
        </EntitySection>
      )}

      {tab === "applications" && (
        <EntitySection title="Opportunity Applications" description="Review student applications for published research opportunities.">
          <AcademicTable columns={appColumns} rows={appRows} emptyDescription="No applications yet." />
        </EntitySection>
      )}

      {tab === "ideas" && (
        <EntitySection
          title="Innovation Idea Portal"
          description="Review startup ideas, research concepts, product innovations, and technology proposals."
          action={<Button onClick={() => setShowIdeaForm(true)}>Submit Idea</Button>}
        >
          {showIdeaForm ? (
            <FormCard title="Submit Innovation Idea" onCancel={() => setShowIdeaForm(false)} onSubmit={() => void handleSubmitIdea()}>
              <FormField label="Title" value={ideaForm.title} onChange={(v) => setIdeaForm((s) => ({ ...s, title: v }))} />
              <FormField label="Problem Statement" value={ideaForm.problemStatement} onChange={(v) => setIdeaForm((s) => ({ ...s, problemStatement: v }))} multiline />
              <FormField label="Proposed Solution" value={ideaForm.proposedSolution} onChange={(v) => setIdeaForm((s) => ({ ...s, proposedSolution: v }))} multiline />
              <FormField label="Description" value={ideaForm.description} onChange={(v) => setIdeaForm((s) => ({ ...s, description: v }))} multiline />
            </FormCard>
          ) : null}
          <AcademicTable columns={ideaColumns} rows={ideaRows} emptyDescription="No innovation ideas submitted yet." />
        </EntitySection>
      )}

      {tab === "publications" && (
        <EntitySection title="Publications & Outcomes" description="Research publications, patents, and documented outcomes.">
          {store.publications.length ? (
            <div className="space-y-3">
              {store.publications.map((p) => (
                <Card key={p._id}>
                  <CardHeader>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <CardDescription>
                      {p.publicationType} · {p.journalOrVenue || "—"} · {p.year || "—"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No publications recorded" description="Add publications linked to research projects." />
          )}
        </EntitySection>
      )}

      <p className="text-muted-foreground text-sm">
        Students can browse published opportunities via the{" "}
        <Link href="/research/opportunities" className="text-primary underline">
          Research Opportunities
        </Link>{" "}
        portal and submit ideas through the innovation submission flow.
      </p>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  return <span className="text-sm capitalize">{status.replace(/_/g, " ")}</span>;
}

function EntitySection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FormCard({
  title,
  children,
  onCancel,
  onSubmit,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {children}
        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={onSubmit}>Save</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea className="form-control min-h-20" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="form-control" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
