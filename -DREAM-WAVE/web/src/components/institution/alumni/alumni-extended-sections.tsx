"use client";

import { CalendarDays, HandHeart, Heart, MessageSquare, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { formatAlumniDate } from "@/components/institution/alumni/alumni-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { institutionAlumniApi } from "@/lib/api/institution-alumni";
import type {
  AlumniEvent,
  EngagementAnalytics,
  GroupPost,
  InstitutionalContribution,
  VolunteerRecord,
} from "@/types/alumni-management";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function AlumniEngagementTab() {
  const { token } = useAuth();
  const [data, setData] = useState<EngagementAnalytics | null>(null);

  useEffect(() => {
    if (!token) return;
    void institutionAlumniApi.getEngagement(token).then((res) => setData(res.analytics));
  }, [token]);

  if (!data?.hasData) {
    return <EmptyState title="No engagement data yet" description="Alumni activity will appear here as your network grows." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InstitutionMetricCard label="Active Alumni" value={data.activeAlumni} hint="Directory" icon={Users} />
        <InstitutionMetricCard label="New Registrations" value={data.newRegistrations} hint="Last 30 days" icon={TrendingUp} />
        <InstitutionMetricCard label="Mentor Participation" value={data.mentorParticipation} hint="Available mentors" icon={Users} />
        <InstitutionMetricCard label="Events Conducted" value={data.eventsConducted} hint="Published/completed" icon={CalendarDays} />
        <InstitutionMetricCard label="Community Groups" value={data.communityGrowth} hint="Active chapters" icon={Users} />
        <InstitutionMetricCard label="Referral Activity" value={data.referralActivity} hint="Career referrals" icon={TrendingUp} />
        <InstitutionMetricCard label="Donations Received" value={formatCurrency(data.donationsReceived)} hint="Approved" icon={Heart} />
        <InstitutionMetricCard label="Volunteer Hours" value={data.totalVolunteerHours} hint="Total contributed" icon={HandHeart} />
      </div>
    </div>
  );
}

export function AlumniEventsTab() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AlumniEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventType: "alumni_meet",
    description: "",
    organizer: "",
    venue: "",
    startDate: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    const res = await institutionAlumniApi.listEvents(token);
    setEvents(res.events);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!token || !form.title || !form.startDate) return;
    await institutionAlumniApi.createEvent(token, form);
    setShowForm(false);
    setForm({ title: "", eventType: "alumni_meet", description: "", organizer: "", venue: "", startDate: "" });
    await load();
  }

  async function handlePublish(id: string) {
    if (!token) return;
    await institutionAlumniApi.publishEvent(token, id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>Create Event</Button>
      </div>
      {showForm ? (
        <Card>
          <CardHeader><CardTitle>New Alumni Event</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <input className="form-control" placeholder="Event title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="form-control" type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} aria-label="Start date" />
            <input className="form-control" placeholder="Organizer" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
            <input className="form-control" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            <textarea className="form-control sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={() => void handleCreate()}>Save</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground text-sm">
                  {event.eventType?.replace(/_/g, " ")} · {event.organizer || "—"} · {formatAlumniDate(event.startDate)}
                </p>
                <p className="text-sm">{event.venue || event.onlinePlatform || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.status}</Badge>
                {event.status === "draft" ? (
                  <Button size="sm" onClick={() => void handlePublish(event._id)}>Publish</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 ? <EmptyState title="No events yet" description="Create alumni meets, reunions, and networking sessions." /> : null}
      </div>
    </div>
  );
}

export function AlumniContributionsTab({ alumniId }: { alumniId?: string }) {
  const { token } = useAuth();
  const [contributions, setContributions] = useState<InstitutionalContribution[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    alumniId: alumniId || "",
    contributionType: "donation",
    title: "",
    amount: "",
    beneficiaries: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    const res = await institutionAlumniApi.listInstitutionalContributions(token);
    setContributions(res.contributions);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!token || !form.alumniId || !form.title) return;
    await institutionAlumniApi.createInstitutionalContribution(token, {
      ...form,
      amount: form.amount ? Number(form.amount) : 0,
    });
    setShowForm(false);
    await load();
  }

  async function handleApprove(id: string) {
    if (!token) return;
    await institutionAlumniApi.approveInstitutionalContribution(token, id, "approved");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>Record Contribution</Button>
      </div>
      {showForm ? (
        <Card>
          <CardHeader><CardTitle>New Institutional Contribution</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <input className="form-control" placeholder="Alumni ID *" value={form.alumniId} onChange={(e) => setForm({ ...form, alumniId: e.target.value })} />
            <input className="form-control" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="form-control" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="form-control" placeholder="Beneficiaries" value={form.beneficiaries} onChange={(e) => setForm({ ...form, beneficiaries: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={() => void handleCreate()}>Save</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {contributions.map((c) => (
        <Card key={c._id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-muted-foreground text-sm">{c.contributionType?.replace(/_/g, " ")} · {c.beneficiaries || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{c.approvalStatus}</Badge>
              {c.approvalStatus === "proposed" || c.approvalStatus === "pending" ? (
                <Button size="sm" onClick={() => void handleApprove(c._id)}>Approve</Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AlumniVolunteersTab({ alumniId }: { alumniId?: string }) {
  const { token } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([]);

  useEffect(() => {
    if (!token) return;
    void institutionAlumniApi.listVolunteers(token).then((res) => setVolunteers(res.volunteers));
  }, [token]);

  async function handleCreate() {
    if (!token || !alumniId) return;
    await institutionAlumniApi.createVolunteerRecord(token, {
      alumniId,
      volunteerRole: "event_volunteer",
      title: "Alumni Event Volunteer",
      hoursContributed: 4,
    });
    const res = await institutionAlumniApi.listVolunteers(token);
    setVolunteers(res.volunteers);
  }

  return (
    <div className="space-y-4">
      {alumniId ? <Button onClick={() => void handleCreate()}>Add Volunteer Record</Button> : null}
      {volunteers.map((v) => (
        <Card key={v._id}>
          <CardContent className="pt-6">
            <p className="font-medium">{v.title}</p>
            <p className="text-muted-foreground text-sm">{v.volunteerRole?.replace(/_/g, " ")} · {v.hoursContributed || 0} hours</p>
          </CardContent>
        </Card>
      ))}
      {volunteers.length === 0 ? <EmptyState title="No volunteer records" description="Track alumni volunteer participation here." /> : null}
    </div>
  );
}

export function AlumniForumsTab({ groupId }: { groupId?: string }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!token || !groupId) return;
    void institutionAlumniApi.listGroupPosts(token, groupId).then((res) => setPosts(res.posts));
  }, [token, groupId]);

  async function handlePost() {
    if (!token || !groupId || !title) return;
    await institutionAlumniApi.createGroupPost(token, groupId, { title, body, postType: "question" });
    setTitle("");
    setBody("");
    const res = await institutionAlumniApi.listGroupPosts(token, groupId);
    setPosts(res.posts);
  }

  if (!groupId) {
    return <EmptyState title="Select a group" description="Create a community group first, then open discussions from its ID." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Discussion</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <input className="form-control" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="form-control" placeholder="Share knowledge, ask questions…" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={() => void handlePost()}><MessageSquare className="mr-2 size-4" />Post</Button>
        </CardContent>
      </Card>
      {posts.map((post) => (
        <Card key={post._id}>
          <CardHeader>
            <CardTitle className="text-base">{post.title}</CardTitle>
            <CardDescription>{post.authorName} · {post.postType?.replace(/_/g, " ")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{post.body}</p>
            {(post.comments || []).length > 0 ? (
              <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
                {post.comments!.map((c, i) => (
                  <li key={i}>{c.authorName}: {c.body}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
