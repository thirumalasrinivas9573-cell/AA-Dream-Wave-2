"use client";

import {
  Briefcase,
  GraduationCap,
  Handshake,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import type { AcademicColumn } from "@/components/institution/academics/academic-table";
import { AcademicTable } from "@/components/institution/academics/academic-table";
import {
  AlumniContributionsTab,
  AlumniEngagementTab,
  AlumniEventsTab,
  AlumniForumsTab,
  AlumniVolunteersTab,
} from "@/components/institution/alumni/alumni-extended-sections";
import {
  ContributionTypeBadge,
  MentorshipStatusBadge,
  VerificationBadge,
  formatAlumniDate,
} from "@/components/institution/alumni/alumni-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { institutionAlumniApi } from "@/lib/api/institution-alumni";
import type {
  AlumniCareerContribution,
  AlumniGroup,
  AlumniMentorship,
  AlumniProfile,
  AlumniStats,
} from "@/types/alumni-management";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "engagement", label: "Engagement" },
  { id: "directory", label: "Directory" },
  { id: "events", label: "Events" },
  { id: "groups", label: "Groups" },
  { id: "forums", label: "Forums" },
  { id: "mentorship", label: "Mentorship" },
  { id: "career", label: "Career Portal" },
  { id: "contributions", label: "Contributions" },
  { id: "volunteers", label: "Volunteers" },
] as const;

type AlumniTab = (typeof TABS)[number]["id"];

export function AlumniManagementPage({ initialTab = "overview" }: { initialTab?: AlumniTab }) {
  const { token } = useAuth();
  const [tab, setTab] = useState<AlumniTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [groups, setGroups] = useState<AlumniGroup[]>([]);
  const [mentorships, setMentorships] = useState<AlumniMentorship[]>([]);
  const [contributions, setContributions] = useState<AlumniCareerContribution[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  const [showAlumniForm, setShowAlumniForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showCareerForm, setShowCareerForm] = useState(false);

  const [alumniForm, setAlumniForm] = useState({
    fullName: "",
    email: "",
    graduationYear: "",
    department: "",
    degree: "",
    currentCompany: "",
    currentRole: "",
    industry: "technology",
    isMentorAvailable: false,
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    groupType: "chapter",
    chapterLocation: "",
  });

  const [careerForm, setCareerForm] = useState({
    alumniId: "",
    contributionType: "job_referral",
    title: "",
    company: "",
    description: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "overview") {
        const res = await institutionAlumniApi.getWorkspace(token);
        setStats(res.workspace.stats);
        setAlumni(res.workspace.recentAlumni || []);
        setMentorships(res.workspace.pendingMentorships || []);
        setContributions(res.workspace.recentContributions || []);
        setGroups(res.workspace.activeGroups || []);
      }
      if (tab === "directory") {
        const res = await institutionAlumniApi.listAlumni(token, {
          q: search || undefined,
          department: department || undefined,
          graduationYear: graduationYear || undefined,
        });
        setAlumni(res.alumni);
      }
      if (tab === "groups") {
        const res = await institutionAlumniApi.listGroups(token);
        setGroups(res.groups);
      }
      if (tab === "mentorship") {
        const res = await institutionAlumniApi.listMentorships(token);
        setMentorships(res.mentorships);
      }
      if (tab === "career") {
        const res = await institutionAlumniApi.listContributions(token);
        setContributions(res.contributions);
        const dir = await institutionAlumniApi.listAlumni(token, { limit: 100 });
        if (!careerForm.alumniId && dir.alumni[0]?._id) {
          setCareerForm((f) => ({ ...f, alumniId: dir.alumni[0]!._id }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alumni data");
    } finally {
      setLoading(false);
    }
  }, [token, tab, search, department, graduationYear, careerForm.alumniId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateAlumni() {
    if (!token || !alumniForm.fullName) return;
    await institutionAlumniApi.createAlumni(token, alumniForm);
    setShowAlumniForm(false);
    setAlumniForm({
      fullName: "",
      email: "",
      graduationYear: "",
      department: "",
      degree: "",
      currentCompany: "",
      currentRole: "",
      industry: "technology",
      isMentorAvailable: false,
    });
    await load();
  }

  async function handleVerify(id: string) {
    if (!token) return;
    await institutionAlumniApi.verifyAlumni(token, id, "verified");
    await load();
  }

  async function handleCreateGroup() {
    if (!token || !groupForm.name) return;
    await institutionAlumniApi.createGroup(token, groupForm);
    setShowGroupForm(false);
    setGroupForm({ name: "", description: "", groupType: "chapter", chapterLocation: "" });
    await load();
  }

  async function handleMatchMentorship(id: string) {
    if (!token) return;
    await institutionAlumniApi.updateMentorship(token, id, "matched");
    await load();
  }

  async function handleCreateContribution() {
    if (!token || !careerForm.alumniId || !careerForm.title) return;
    await institutionAlumniApi.createContribution(token, careerForm);
    setShowCareerForm(false);
    setCareerForm({ alumniId: careerForm.alumniId, contributionType: "job_referral", title: "", company: "", description: "" });
    await load();
  }

  const alumniRows = alumni.map((a) => ({ ...a, id: a._id }));

  const alumniColumns: AcademicColumn<(typeof alumniRows)[number]>[] = [
    { key: "fullName", header: "Name", cell: (row) => row.fullName },
    { key: "graduationYear", header: "Batch", cell: (row) => row.graduationYear || "—" },
    { key: "department", header: "Department", cell: (row) => row.department || "—" },
    { key: "currentCompany", header: "Company", cell: (row) => row.currentCompany || "—" },
    { key: "currentRole", header: "Role", cell: (row) => row.currentRole || "—" },
    {
      key: "verificationStatus",
      header: "Status",
      cell: (row) => <VerificationBadge status={row.verificationStatus ?? "pending"} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.verificationStatus !== "verified" ? (
          <Button size="sm" variant="outline" onClick={() => void handleVerify(row._id)}>
            Verify
          </Button>
        ) : row.isMentorAvailable ? (
          <Badge variant="outline">Mentor</Badge>
        ) : null,
    },
  ];

  if (loading && !stats && tab === "overview") {
    return <RouteLoading label="Loading alumni network" />;
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Alumni Network"
        title="Alumni & Professional Community"
        description="Manage alumni directory, mentorship programs, community groups, and career support."
      />

      <nav aria-label="Alumni sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Management</span>
        <Link href={INSTITUTION_ROUTES.alumniAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Analytics
        </Link>
        <Link href={INSTITUTION_ROUTES.alumniReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reports
        </Link>
      </nav>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" && stats ? (
        <>
          {!stats.hasData ? (
            <EmptyState
              title="No alumni data yet"
              description="Add alumni profiles or promote graduated students to build your alumni network."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InstitutionMetricCard label="Total Alumni" value={stats.totalAlumni} hint="Directory" icon={GraduationCap} />
                <InstitutionMetricCard label="Verified" value={stats.verifiedAlumni} hint="Confirmed profiles" icon={UserCheck} />
                <InstitutionMetricCard label="Mentors Available" value={stats.mentorAvailable} hint="Open to mentor" icon={Handshake} />
                <InstitutionMetricCard label="Active Mentorships" value={stats.activeMentorships} hint="In progress" icon={Users} />
                <InstitutionMetricCard label="Pending Requests" value={stats.pendingMentorshipRequests} hint="Awaiting match" icon={Users} />
                <InstitutionMetricCard label="Community Groups" value={stats.activeGroups} hint="Chapters & interests" icon={Users} />
                <InstitutionMetricCard label="Career Contributions" value={stats.careerContributions} hint="All time" icon={Briefcase} />
                <InstitutionMetricCard label="Open Opportunities" value={stats.openOpportunities} hint="Active listings" icon={Briefcase} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Alumni</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AlumniMiniList items={alumni} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Mentorship Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MentorshipMiniList items={mentorships} onMatch={handleMatchMentorship} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      ) : null}

      {tab === "engagement" ? <AlumniEngagementTab /> : null}

      {tab === "events" ? <AlumniEventsTab /> : null}

      {tab === "forums" ? <AlumniForumsTab groupId={groups[0]?._id ?? ""} /> : null}

      {tab === "contributions" ? <AlumniContributionsTab alumniId={alumni[0]?._id ?? ""} /> : null}

      {tab === "volunteers" ? <AlumniVolunteersTab alumniId={alumni[0]?._id ?? ""} /> : null}

      {tab === "directory" ? (
        <Section
          title="Alumni Directory"
          description="Search and manage verified alumni profiles."
          action={
            <Button onClick={() => setShowAlumniForm(true)}>Add Alumni</Button>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <input className="form-control" placeholder="Search name, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input className="form-control" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <input className="form-control" placeholder="Graduation year" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} />
          </div>
          {showAlumniForm ? (
            <Card className="mb-4">
              <CardHeader><CardTitle>New Alumni Profile</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <input className="form-control" placeholder="Full name *" value={alumniForm.fullName} onChange={(e) => setAlumniForm({ ...alumniForm, fullName: e.target.value })} />
                <input className="form-control" placeholder="Email" value={alumniForm.email} onChange={(e) => setAlumniForm({ ...alumniForm, email: e.target.value })} />
                <input className="form-control" placeholder="Graduation year" value={alumniForm.graduationYear} onChange={(e) => setAlumniForm({ ...alumniForm, graduationYear: e.target.value })} />
                <input className="form-control" placeholder="Department" value={alumniForm.department} onChange={(e) => setAlumniForm({ ...alumniForm, department: e.target.value })} />
                <input className="form-control" placeholder="Current company" value={alumniForm.currentCompany} onChange={(e) => setAlumniForm({ ...alumniForm, currentCompany: e.target.value })} />
                <input className="form-control" placeholder="Current role" value={alumniForm.currentRole} onChange={(e) => setAlumniForm({ ...alumniForm, currentRole: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={alumniForm.isMentorAvailable} onChange={(e) => setAlumniForm({ ...alumniForm, isMentorAvailable: e.target.checked })} />
                  Available as mentor
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={() => void handleCreateAlumni()}>Save Profile</Button>
                  <Button variant="ghost" onClick={() => setShowAlumniForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <AcademicTable columns={alumniColumns} rows={alumniRows} emptyDescription="No alumni profiles found." />
        </Section>
      ) : null}

      {tab === "groups" ? (
        <Section title="Community Groups & Chapters" description="Interest-based communities and alumni chapters." action={<Button onClick={() => setShowGroupForm(true)}>Create Group</Button>}>
          {showGroupForm ? (
            <Card className="mb-4">
              <CardHeader><CardTitle>New Group</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <input className="form-control" placeholder="Group name *" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
                <input className="form-control" placeholder="Chapter location" value={groupForm.chapterLocation} onChange={(e) => setGroupForm({ ...groupForm, chapterLocation: e.target.value })} />
                <textarea className="form-control sm:col-span-2" placeholder="Description" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={() => void handleCreateGroup()}>Create</Button>
                  <Button variant="ghost" onClick={() => setShowGroupForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <Card key={g._id}>
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>{g.groupType?.replace(/_/g, " ")} · {g.memberCount || 0} members</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{g.description || "No description."}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {tab === "mentorship" ? (
        <Section title="Mentorship Program" description="Track alumni-to-student mentorship requests and matching.">
          <div className="space-y-3">
            {mentorships.map((m) => (
              <Card key={m._id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="font-medium">{m.studentName || "Student"}</p>
                    <p className="text-muted-foreground text-sm">{m.studentDepartment || "—"} · {formatAlumniDate(m.createdAt)}</p>
                    <p className="text-sm">{m.requestMessage || (m.goals || []).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MentorshipStatusBadge status={m.status ?? "requested"} />
                    {m.status === "requested" ? (
                      <Button size="sm" onClick={() => void handleMatchMentorship(m._id)}>Match</Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
            {mentorships.length === 0 ? <EmptyState title="No mentorship records" description="Students can request mentorship from verified alumni mentors." /> : null}
          </div>
        </Section>
      ) : null}

      {tab === "career" ? (
        <Section title="Career Support" description="Job referrals, guidance sessions, and alumni career contributions." action={<Button onClick={() => setShowCareerForm(true)}>Add Contribution</Button>}>
          {showCareerForm ? (
            <Card className="mb-4">
              <CardHeader><CardTitle>New Career Contribution</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <input className="form-control" placeholder="Title *" value={careerForm.title} onChange={(e) => setCareerForm({ ...careerForm, title: e.target.value })} />
                <input className="form-control" placeholder="Company" value={careerForm.company} onChange={(e) => setCareerForm({ ...careerForm, company: e.target.value })} />
                <textarea className="form-control sm:col-span-2" placeholder="Description" value={careerForm.description} onChange={(e) => setCareerForm({ ...careerForm, description: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={() => void handleCreateContribution()}>Publish</Button>
                  <Button variant="ghost" onClick={() => setShowCareerForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <div className="space-y-3">
            {contributions.map((c) => (
              <Card key={c._id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-muted-foreground text-sm">{c.company || "—"} · {c.location || "—"}</p>
                  </div>
                  <ContributionTypeBadge type={c.contributionType ?? "career_guidance"} />
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function AlumniMiniList({ items }: { items: AlumniProfile[] }) {
  if (!items.length) return <p className="text-muted-foreground text-sm">No alumni yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((a) => (
        <li key={a._id} className="flex items-center justify-between gap-2">
          <span>{a.fullName} · {a.currentCompany || "—"}</span>
          <VerificationBadge status={a.verificationStatus ?? "pending"} />
        </li>
      ))}
    </ul>
  );
}

function MentorshipMiniList({
  items,
  onMatch,
}: {
  items: AlumniMentorship[];
  onMatch: (id: string) => void;
}) {
  if (!items.length) return <p className="text-muted-foreground text-sm">No pending requests.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((m) => (
        <li key={m._id} className="flex items-center justify-between gap-2">
          <span>{m.studentName} requested mentorship</span>
          <Button size="sm" variant="outline" onClick={() => onMatch(m._id)}>Match</Button>
        </li>
      ))}
    </ul>
  );
}
