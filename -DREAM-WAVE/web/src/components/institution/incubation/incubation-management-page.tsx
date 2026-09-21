"use client";

import {
  Briefcase,
  CalendarDays,
  DollarSign,
  Lightbulb,
  Rocket,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import type { AcademicColumn } from "@/components/institution/academics/academic-table";
import { AcademicTable } from "@/components/institution/academics/academic-table";
import {
  EventTypeBadge,
  FundingTypeBadge,
  IncubationStageBadge,
  MentorTypeBadge,
  formatFundingAmount,
  formatIncubationDate,
} from "@/components/institution/incubation/incubation-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { institutionIncubationApi } from "@/lib/api/institution-incubation";
import type {
  CollaborationItem,
  FundingRecord,
  IncubationStats,
  InnovationEvent,
  InvestorProfile,
  MentorProfile,
  MentorshipSession,
  StartupProfile,
} from "@/types/incubation-management";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "startups", label: "Startups" },
  { id: "mentors", label: "Mentors" },
  { id: "sessions", label: "Mentorship" },
  { id: "funding", label: "Funding" },
  { id: "investors", label: "Investors" },
  { id: "events", label: "Events" },
  { id: "collaboration", label: "Collaboration" },
] as const;

type IncubationTab = (typeof TABS)[number]["id"];

export function IncubationManagementPage({ initialTab = "overview" }: { initialTab?: IncubationTab }) {
  const { token } = useAuth();
  const [tab, setTab] = useState<IncubationTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IncubationStats | null>(null);
  const [startups, setStartups] = useState<StartupProfile[]>([]);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [funding, setFunding] = useState<FundingRecord[]>([]);
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [events, setEvents] = useState<InnovationEvent[]>([]);
  const [collaboration, setCollaboration] = useState<CollaborationItem[]>([]);

  const [showStartupForm, setShowStartupForm] = useState(false);
  const [showMentorForm, setShowMentorForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [startupForm, setStartupForm] = useState({ name: "", description: "", category: "technology", founders: "" });
  const [mentorForm, setMentorForm] = useState({ name: "", mentorType: "faculty", organization: "", expertise: "" });
  const [eventForm, setEventForm] = useState({ title: "", eventType: "hackathon", description: "", startDate: "" });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "overview") {
        const res = await institutionIncubationApi.getWorkspace(token);
        setStats(res.workspace.stats);
        setStartups(res.workspace.recentStartups || []);
      }
      if (tab === "startups") {
        const res = await institutionIncubationApi.listStartups(token);
        setStartups(res.startups);
      }
      if (tab === "mentors") {
        const res = await institutionIncubationApi.listMentors(token);
        setMentors(res.mentors);
      }
      if (tab === "sessions") {
        const res = await institutionIncubationApi.listSessions(token);
        setSessions(res.sessions);
      }
      if (tab === "funding") {
        const res = await institutionIncubationApi.listFunding(token);
        setFunding(res.funding);
      }
      if (tab === "investors") {
        const res = await institutionIncubationApi.listInvestors(token);
        setInvestors(res.investors);
      }
      if (tab === "events") {
        const res = await institutionIncubationApi.listEvents(token);
        setEvents(res.events);
      }
      if (tab === "collaboration") {
        const res = await institutionIncubationApi.listCollaboration(token);
        setCollaboration(res.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incubation data");
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateStartup() {
    if (!token || !startupForm.name) return;
    try {
      await institutionIncubationApi.createStartup(token, {
        name: startupForm.name,
        description: startupForm.description,
        category: startupForm.category,
        founders: startupForm.founders.split(",").map((s) => s.trim()).filter(Boolean),
        status: "active",
      });
      setShowStartupForm(false);
      setStartupForm({ name: "", description: "", category: "technology", founders: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create startup");
    }
  }

  async function handleCreateMentor() {
    if (!token || !mentorForm.name) return;
    try {
      await institutionIncubationApi.createMentor(token, {
        ...mentorForm,
        expertise: mentorForm.expertise.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setShowMentorForm(false);
      setMentorForm({ name: "", mentorType: "faculty", organization: "", expertise: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mentor");
    }
  }

  async function handleCreateEvent() {
    if (!token || !eventForm.title || !eventForm.startDate) return;
    try {
      await institutionIncubationApi.createEvent(token, eventForm);
      setShowEventForm(false);
      setEventForm({ title: "", eventType: "hackathon", description: "", startDate: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    }
  }

  async function handlePublishEvent(id: string) {
    if (!token) return;
    await institutionIncubationApi.publishEvent(token, id);
    await load();
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading && !stats && tab === "overview") return <RouteLoading label="Loading incubation workspace" />;

  const startupRows = startups.map((r) => ({ ...r, id: r._id }));
  const mentorRows = mentors.map((r) => ({ ...r, id: r._id }));
  const sessionRows = sessions.map((r) => ({ ...r, id: r._id }));
  const fundingRows = funding.map((r) => ({ ...r, id: r._id }));
  const investorRows = investors.map((r) => ({ ...r, id: r._id }));
  const eventRows = events.map((r) => ({ ...r, id: r._id }));
  const collabRows = collaboration.map((r) => ({ ...r, id: r._id }));

  const startupColumns: AcademicColumn<(typeof startupRows)[number]>[] = [
    { key: "name", header: "Startup", cell: (r) => r.name },
    { key: "category", header: "Category", cell: (r) => r.category || "—" },
    { key: "stage", header: "Stage", cell: (r) => r.stage || "—" },
    { key: "status", header: "Status", cell: (r) => <span className="capitalize">{r.status}</span> },
  ];

  const mentorColumns: AcademicColumn<(typeof mentorRows)[number]>[] = [
    { key: "name", header: "Mentor", cell: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => <MentorTypeBadge type={r.mentorType} /> },
    { key: "org", header: "Organization", cell: (r) => r.organization || "—" },
    { key: "status", header: "Status", cell: (r) => r.status },
  ];

  const sessionColumns: AcademicColumn<(typeof sessionRows)[number]>[] = [
    { key: "date", header: "Date", cell: (r) => formatIncubationDate(r.scheduledDate) },
    { key: "type", header: "Type", cell: (r) => r.sessionType || "—" },
    { key: "status", header: "Status", cell: (r) => r.status },
  ];

  const fundingColumns: AcademicColumn<(typeof fundingRows)[number]>[] = [
    { key: "source", header: "Source", cell: (r) => r.fundingSource },
    { key: "type", header: "Type", cell: (r) => <FundingTypeBadge type={r.fundingType} /> },
    { key: "amount", header: "Amount", cell: (r) => formatFundingAmount(r.amount) },
    { key: "status", header: "Status", cell: (r) => r.status },
  ];

  const eventColumns: AcademicColumn<(typeof eventRows)[number]>[] = [
    { key: "title", header: "Event", cell: (r) => r.title },
    { key: "type", header: "Type", cell: (r) => <EventTypeBadge type={r.eventType} /> },
    { key: "date", header: "Date", cell: (r) => formatIncubationDate(r.startDate) },
    { key: "status", header: "Status", cell: (r) => r.status },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "draft" ? (
          <Button size="sm" variant="outline" onClick={() => void handlePublishEvent(r._id)}>Publish</Button>
        ) : null,
    },
  ];

  const collabColumns: AcademicColumn<(typeof collabRows)[number]>[] = [
    { key: "type", header: "Type", cell: (r) => r.collaborationType },
    { key: "title", header: "Title", cell: (r) => r.title },
    { key: "author", header: "Author", cell: (r) => r.authorName || "—" },
    { key: "date", header: "Date", cell: (r) => formatIncubationDate(r.createdAt) },
  ];

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Innovation Ecosystem"
        title="Incubation Management"
        description="Manage startup incubation lifecycle, mentors, funding, investors, events, and collaboration."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {!stats?.hasData ? (
            <EmptyState title="No incubation data yet" description="Create startups, mentors, and events to populate the incubation workspace." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InstitutionMetricCard label="Startups" value={stats.totalStartups} hint={`${stats.activeStartups} active`} icon={Rocket} />
              <InstitutionMetricCard label="Mentors" value={stats.totalMentors} hint="Active directory" icon={UserCheck} />
              <InstitutionMetricCard label="Funding" value={formatFundingAmount(stats.totalFundingAmount)} hint={`${stats.totalFundingRecords} records`} icon={DollarSign} />
              <InstitutionMetricCard label="Investors" value={stats.totalInvestors} hint="Network contacts" icon={Briefcase} />
              <InstitutionMetricCard label="Events" value={stats.publishedEvents} hint="Published" icon={CalendarDays} />
              <InstitutionMetricCard label="Sessions" value={stats.totalSessions} hint="Mentorship" icon={Users} />
              <InstitutionMetricCard label="Graduated" value={stats.graduatedStartups} hint="Completed incubation" icon={Lightbulb} />
            </div>
          )}
          {Object.keys(stats?.byIncubationStage || {}).length ? (
            <Card>
              <CardHeader><CardTitle>Incubation Pipeline</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(stats!.byIncubationStage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <IncubationStageBadge stage={stage} />
                    <span className="text-sm tabular-nums">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {tab === "startups" && (
        <Section title="Startup Profiles" description="Manage startup lifecycle with duplicate prevention." action={<Button onClick={() => setShowStartupForm(true)}>New Startup</Button>}>
          {showStartupForm ? (
            <FormCard title="Create Startup" onCancel={() => setShowStartupForm(false)} onSubmit={() => void handleCreateStartup()}>
              <Field label="Startup Name" value={startupForm.name} onChange={(v) => setStartupForm((s) => ({ ...s, name: v }))} />
              <Field label="Founders (comma-separated)" value={startupForm.founders} onChange={(v) => setStartupForm((s) => ({ ...s, founders: v }))} />
              <Field label="Description" value={startupForm.description} onChange={(v) => setStartupForm((s) => ({ ...s, description: v }))} multiline />
            </FormCard>
          ) : null}
          <AcademicTable columns={startupColumns} rows={startupRows} emptyDescription="No startups yet." />
        </Section>
      )}

      {tab === "mentors" && (
        <Section title="Mentor Directory" description="Faculty, industry, alumni, investor, and entrepreneur mentors." action={<Button onClick={() => setShowMentorForm(true)}>Add Mentor</Button>}>
          {showMentorForm ? (
            <FormCard title="Add Mentor" onCancel={() => setShowMentorForm(false)} onSubmit={() => void handleCreateMentor()}>
              <Field label="Name" value={mentorForm.name} onChange={(v) => setMentorForm((s) => ({ ...s, name: v }))} />
              <Field label="Organization" value={mentorForm.organization} onChange={(v) => setMentorForm((s) => ({ ...s, organization: v }))} />
              <Field label="Expertise (comma-separated)" value={mentorForm.expertise} onChange={(v) => setMentorForm((s) => ({ ...s, expertise: v }))} />
            </FormCard>
          ) : null}
          <AcademicTable columns={mentorColumns} rows={mentorRows} emptyDescription="No mentors yet." />
        </Section>
      )}

      {tab === "sessions" && (
        <Section title="Mentorship Sessions" description="Scheduled sessions with goals, notes, and action items.">
          <AcademicTable columns={sessionColumns} rows={sessionRows} emptyDescription="No mentorship sessions yet." />
        </Section>
      )}

      {tab === "funding" && (
        <Section title="Funding Management" description="Track seed funding, grants, angel, VC, and institutional funding.">
          <AcademicTable columns={fundingColumns} rows={fundingRows} emptyDescription="No funding records yet." />
        </Section>
      )}

      {tab === "investors" && (
        <Section title="Investor Network" description="Angel networks, VC firms, and investment interests.">
          <AcademicTable columns={investorRows.length ? [{ key: "name", header: "Investor", cell: (r: InvestorProfile & { id: string }) => r.name }, { key: "type", header: "Type", cell: (r: InvestorProfile & { id: string }) => r.investorType }, { key: "org", header: "Organization", cell: (r: InvestorProfile & { id: string }) => r.organization || "—" }] : []} rows={investorRows} emptyDescription="No investors yet." />
        </Section>
      )}

      {tab === "events" && (
        <Section title="Innovation Events" description="Hackathons, demo days, pitch events, workshops, and conferences." action={<Button onClick={() => setShowEventForm(true)}>New Event</Button>}>
          {showEventForm ? (
            <FormCard title="Create Event" onCancel={() => setShowEventForm(false)} onSubmit={() => void handleCreateEvent()}>
              <Field label="Title" value={eventForm.title} onChange={(v) => setEventForm((s) => ({ ...s, title: v }))} />
              <Field label="Start Date" value={eventForm.startDate} onChange={(v) => setEventForm((s) => ({ ...s, startDate: v }))} type="date" />
              <Field label="Description" value={eventForm.description} onChange={(v) => setEventForm((s) => ({ ...s, description: v }))} multiline />
            </FormCard>
          ) : null}
          <AcademicTable columns={eventColumns} rows={eventRows} emptyDescription="No events yet." />
        </Section>
      )}

      {tab === "collaboration" && (
        <Section title="Collaboration Platform" description="Discussions, file sharing, tasks, and activity timeline.">
          <AcademicTable columns={collabColumns} rows={collabRows} emptyDescription="No collaboration activity yet." />
        </Section>
      )}
    </div>
  );
}

function Section({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FormCard({ title, children, onCancel, onSubmit }: { title: string; children: ReactNode; onCancel: () => void; onSubmit: () => void }) {
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

function Field({ label, value, onChange, multiline, type = "text" }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea className="form-control min-h-20" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="form-control" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
