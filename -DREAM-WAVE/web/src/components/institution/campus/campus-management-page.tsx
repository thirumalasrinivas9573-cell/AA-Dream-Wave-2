"use client";

import {
  CalendarClock,
  CalendarDays,
  Download,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { exportCsv } from "@/components/institution/academics/academic-ui";
import {
  AlbumDialog,
  AnnouncementDialog,
  CampusNotificationDialog,
  ClubDialog,
  EventDialog,
  NewsDialog,
} from "@/components/institution/campus/campus-dialogs";
import { CampusEventDrawer } from "@/components/institution/campus/campus-event-drawer";
import {
  ANNOUNCEMENT_CATEGORY_OPTIONS,
  ANNOUNCEMENT_STATUS_OPTIONS,
  AnnouncementStatusBadge,
  categoryLabel,
  EVENT_CATEGORY_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EventStatusBadge,
  formatDate,
  newsTypeLabel,
  PriorityBadge,
} from "@/components/institution/campus/campus-ui";
import { InstitutionMetricCard } from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import {
  EntityFilterSelect,
  EntityPagination,
  EntityPanel,
  usePagination,
} from "@/components/institution/shared/entity-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { useCampusManagementStore } from "@/store/campus-management-store";
import type {
  Announcement,
  CampusEvent,
  CampusNews,
  GalleryAlbum,
  StudentClub,
} from "@/types/campus-management";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "clubs", label: "Clubs" },
  { id: "gallery", label: "Gallery" },
  { id: "news", label: "News" },
  { id: "calendar", label: "Calendar" },
] as const;

type CampusTab = (typeof TABS)[number]["id"];

type DialogState =
  | { kind: "announcement"; record: Announcement | null }
  | { kind: "event"; record: CampusEvent | null }
  | { kind: "club"; record: StudentClub | null }
  | { kind: "album"; record: GalleryAlbum | null }
  | { kind: "news"; record: CampusNews | null }
  | null;

export function CampusManagementPage({
  initialTab = "overview",
}: {
  initialTab?: CampusTab;
}) {
  const store = useCampusManagementStore();
  const { hydrated, hydrate, announcements, events, clubs, albums, news } = store;

  const [tab, setTab] = useState<CampusTab>(initialTab);
  const [query, setQuery] = useState("");
  const [annFilter, setAnnFilter] = useState({ category: "", status: "", audience: "" });
  const [eventFilter, setEventFilter] = useState({ category: "", mode: "", status: "", department: "" });
  const [clubFilter, setClubFilter] = useState({ category: "", status: "" });
  const [galleryFilter, setGalleryFilter] = useState({ category: "" });
  const [newsFilter, setNewsFilter] = useState({ type: "" });

  const [dialog, setDialog] = useState<DialogState>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: CampusTab; id: string; label: string } | null
  >(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const changeTab = useCallback((next: CampusTab) => {
    setTab(next);
    setQuery("");
  }, []);

  const term = query.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const metrics = useMemo(
    () =>
      [
        { label: "Upcoming Events", value: events.filter((e) => e.status === "upcoming").length, hint: "Scheduled ahead", icon: CalendarClock },
        { label: "Today's Events", value: events.filter((e) => e.date === today).length, hint: "Happening today", icon: CalendarDays },
        { label: "Active Clubs", value: clubs.filter((c) => c.status === "active").length, hint: "Student clubs", icon: Users },
        { label: "Announcements", value: announcements.filter((a) => a.status === "published").length, hint: "Live notices", icon: Megaphone },
        { label: "Student Activities", value: clubs.reduce((sum, c) => sum + c.upcomingActivities.length, 0), hint: "Planned activities", icon: Sparkles },
        { label: "Competitions", value: news.filter((n) => n.type === "competition").length + events.filter((e) => e.category === "sports").length, hint: "Ongoing contests", icon: Trophy },
        { label: "Hackathons", value: events.filter((e) => e.category === "hackathon").length, hint: "Innovation drives", icon: Trophy },
        { label: "Gallery Albums", value: albums.length, hint: "Media collections", icon: ImageIcon },
        { label: "Campus News", value: news.length, hint: "News & highlights", icon: Newspaper },
      ] as const,
    [albums.length, announcements, clubs, events, news, today],
  );

  const filteredAnnouncements = useMemo(
    () =>
      announcements
        .filter(
          (a) =>
            (!term || [a.title, a.body].join(" ").toLowerCase().includes(term)) &&
            (!annFilter.category || a.category === annFilter.category) &&
            (!annFilter.status || a.status === annFilter.status) &&
            (!annFilter.audience || a.audience === annFilter.audience),
        )
        .toSorted((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt)),
    [announcements, term, annFilter],
  );

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          (!term || [e.title, e.organizer, e.venue].join(" ").toLowerCase().includes(term)) &&
          (!eventFilter.category || e.category === eventFilter.category) &&
          (!eventFilter.mode || e.mode === eventFilter.mode) &&
          (!eventFilter.status || e.status === eventFilter.status) &&
          (!eventFilter.department || e.department === eventFilter.department),
      ),
    [events, term, eventFilter],
  );

  const filteredClubs = useMemo(
    () =>
      clubs.filter(
        (c) =>
          (!term || [c.name, c.coordinator, c.president].join(" ").toLowerCase().includes(term)) &&
          (!clubFilter.category || c.category === clubFilter.category) &&
          (!clubFilter.status || c.status === clubFilter.status),
      ),
    [clubs, term, clubFilter],
  );

  const filteredAlbums = useMemo(
    () =>
      albums.filter(
        (a) =>
          (!term || a.title.toLowerCase().includes(term)) &&
          (!galleryFilter.category || a.category === galleryFilter.category),
      ),
    [albums, term, galleryFilter],
  );

  const filteredNews = useMemo(
    () =>
      news
        .filter(
          (n) =>
            (!term || [n.title, n.summary].join(" ").toLowerCase().includes(term)) &&
            (!newsFilter.type || n.type === newsFilter.type),
        )
        .toSorted((a, b) => b.date.localeCompare(a.date)),
    [news, term, newsFilter],
  );

  const calendarEntries = useMemo(() => {
    const entries = [
      ...events.map((e) => ({ id: `e-${e.id}`, date: e.date, title: e.title, kind: "Event", tone: "border-primary/40 text-primary" })),
      ...announcements.filter((a) => a.category === "examination" || a.category === "holiday").map((a) => ({ id: `a-${a.id}`, date: a.publishAt, title: a.title, kind: a.category === "holiday" ? "Holiday" : "Examination", tone: "border-amber-500/40 text-amber-600 dark:text-amber-400" })),
      ...news.map((n) => ({ id: `n-${n.id}`, date: n.date, title: n.title, kind: "News", tone: "border-sky-500/40 text-sky-600 dark:text-sky-400" })),
    ];
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [announcements, events, news]);

  const eventDepartments = useMemo(() => [...new Set(events.map((e) => e.department))].sort(), [events]);

  const announcementPagination = usePagination(filteredAnnouncements);
  const eventPagination = usePagination(filteredEvents);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    if (kind === "announcements") store.removeAnnouncement(id);
    if (kind === "events") store.removeEvent(id);
    if (kind === "clubs") store.removeClub(id);
    if (kind === "gallery") store.removeAlbum(id);
    if (kind === "news") store.removeNews(id);
  };

  const importNotice = () =>
    window.alert(
      "Bulk media / content import is wired to the campus content pipeline. Connect a file or media source to ingest.",
    );

  if (!hydrated) return <RouteLoading label="Loading campus experience" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Institution ERP"
        title="Campus Communication & Student Engagement"
        description="Manage announcements, events, clubs, gallery, news, and the campus calendar — connecting the institution with students in real time."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={() => setNotifyOpen(true)}>
              <Megaphone aria-hidden="true" />
              Broadcast
            </Button>
            <Button type="button" className="h-10" onClick={() => setDialog({ kind: "announcement", record: null })}>
              <Plus aria-hidden="true" />
              New Announcement
            </Button>
          </div>
        }
      />

      <nav aria-label="Campus sections" className="border-border flex flex-wrap gap-1 border-b pb-2">
        <span className={buttonVariants({ variant: "default", size: "sm" })}>Campus</span>
        <Link href={INSTITUTION_ROUTES.campusAnalytics} className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>
        <Link href={INSTITUTION_ROUTES.campusReports} className={buttonVariants({ variant: "ghost", size: "sm" })}>Reports</Link>
      </nav>

      <section aria-labelledby="campus-metrics-heading">
        <h2 id="campus-metrics-heading" className="sr-only">Campus metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {metrics.map((metric) => (
            <InstitutionMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div role="tablist" aria-label="Campus modules" className="flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={buttonVariants({ variant: tab === item.id ? "default" : "ghost", size: "sm" })}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Pinned announcements</CardTitle>
              <CardDescription>Priority notices for the campus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.filter((a) => a.pinned).map((a) => (
                <div key={a.id} className="border-border flex items-start justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{a.body}</p>
                  </div>
                  <PriorityBadge priority={a.priority} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Upcoming events</CardTitle>
              <CardDescription>Next campus activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.filter((e) => e.status === "upcoming" || e.status === "ongoing").map((e) => (
                <button key={e.id} type="button" onClick={() => setSelectedEventId(e.id)} className="border-border hover:bg-muted/50 flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl text-xs font-semibold">{e.bannerInitials}</span>
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(e.date)} · {e.venue}</p>
                    </div>
                  </div>
                  <EventStatusBadge status={e.status} />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "announcements" ? (
        <EntityPanel
          title="Announcement center"
          description="Create, schedule, pin, and target campus announcements."
          count={filteredAnnouncements.length}
          addLabel="New announcement"
          onAdd={() => setDialog({ kind: "announcement", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "announcements.csv",
              ["Title", "Category", "Priority", "Audience", "Publish", "Expiry", "Views", "Status"],
              filteredAnnouncements.map((a) => [a.title, a.category, a.priority, a.audience, a.publishAt, a.expiryAt, a.views, a.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search announcements by title or content…"
          onClearFilters={() => setAnnFilter({ category: "", status: "", audience: "" })}
          filters={
            <>
              <EntityFilterSelect label="Category" value={annFilter.category} options={ANNOUNCEMENT_CATEGORY_OPTIONS} onChange={(v) => setAnnFilter((f) => ({ ...f, category: v }))} />
              <EntityFilterSelect label="Status" value={annFilter.status} options={ANNOUNCEMENT_STATUS_OPTIONS} onChange={(v) => setAnnFilter((f) => ({ ...f, status: v }))} />
              <EntityFilterSelect label="Audience" value={annFilter.audience} options={[{ value: "students", label: "Students" }, { value: "faculty", label: "Faculty" }, { value: "departments", label: "Departments" }, { value: "institution", label: "Institution" }]} onChange={(v) => setAnnFilter((f) => ({ ...f, audience: v }))} />
            </>
          }
        >
          {filteredAnnouncements.length ? (
            <div className="grid gap-3">
              {announcementPagination.visible.map((a) => (
                <Card key={a.id} className={a.pinned ? "border-primary/40 bg-card/80" : "bg-card/80"}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {a.pinned ? <Pin className="text-primary size-4" aria-hidden="true" /> : null}
                        <p className="font-medium">{a.title}</p>
                        <Badge variant="outline" className="capitalize">{a.category}</Badge>
                        <PriorityBadge priority={a.priority} />
                        <AnnouncementStatusBadge status={a.status} />
                      </div>
                      <p className="text-muted-foreground text-sm">{a.body}</p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {a.audience} · Published {formatDate(a.publishAt)} · Expires {formatDate(a.expiryAt)} · {a.views} views
                        {a.attachments.length ? ` · ${a.attachments.length} attachment(s)` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={a.pinned ? "Unpin" : "Pin"} onClick={() => store.togglePin(a.id)}>
                        {a.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Edit announcement" onClick={() => setDialog({ kind: "announcement", record: a })}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete announcement" onClick={() => setDeleteTarget({ kind: "announcements", id: a.id, label: a.title })}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <EntityPagination page={announcementPagination.page} pageCount={announcementPagination.pageCount} total={filteredAnnouncements.length} onPage={announcementPagination.setPage} />
            </div>
          ) : (
            <EmptyState title="No announcements" description="Create an announcement to reach students and faculty." titleAs="h3" />
          )}
        </EntityPanel>
      ) : null}

      {tab === "events" ? (
        <EntityPanel
          title="Event management"
          description="Create and manage workshops, seminars, hackathons, festivals, and more."
          count={filteredEvents.length}
          addLabel="Create event"
          onAdd={() => setDialog({ kind: "event", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "events.csv",
              ["Title", "Category", "Date", "Venue", "Mode", "Capacity", "Registered", "Status"],
              filteredEvents.map((e) => [e.title, e.category, e.date, e.venue, e.mode, e.capacity, e.registered, e.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search events by title, organizer, or venue…"
          onClearFilters={() => setEventFilter({ category: "", mode: "", status: "", department: "" })}
          filters={
            <>
              <EntityFilterSelect label="Category" value={eventFilter.category} options={EVENT_CATEGORY_OPTIONS} onChange={(v) => setEventFilter((f) => ({ ...f, category: v }))} />
              <EntityFilterSelect label="Mode" value={eventFilter.mode} options={[{ value: "online", label: "Online" }, { value: "offline", label: "Offline" }, { value: "hybrid", label: "Hybrid" }]} onChange={(v) => setEventFilter((f) => ({ ...f, mode: v }))} />
              <EntityFilterSelect label="Status" value={eventFilter.status} options={EVENT_STATUS_OPTIONS} onChange={(v) => setEventFilter((f) => ({ ...f, status: v }))} />
              <EntityFilterSelect label="Department" value={eventFilter.department} options={eventDepartments.map((d) => ({ value: d, label: d }))} onChange={(v) => setEventFilter((f) => ({ ...f, department: v }))} />
            </>
          }
        >
          {filteredEvents.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {eventPagination.visible.map((e) => (
                <Card key={e.id} className="bg-card/80 flex flex-col backdrop-blur-sm" interactive>
                  <CardHeader>
                    <div className="from-primary/15 to-primary/5 mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br">
                      <span className="text-primary text-2xl font-semibold">{e.bannerInitials}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{categoryLabel(e.category)}</Badge>
                      <EventStatusBadge status={e.status} />
                    </div>
                    <CardTitle className="mt-1 text-base">{e.title}</CardTitle>
                    <CardDescription>{formatDate(e.date)} · {e.time} · {e.venue}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    <p className="text-muted-foreground text-xs">{e.registered}/{e.capacity} registered · {e.mode}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => setSelectedEventId(e.id)}>View</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "event", record: e })}><Pencil aria-hidden="true" />Edit</Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete event" onClick={() => setDeleteTarget({ kind: "events", id: e.id, label: e.title })}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No events" description="Create a campus event to get started." titleAs="h3" />
          )}
          {filteredEvents.length ? (
            <EntityPagination page={eventPagination.page} pageCount={eventPagination.pageCount} total={filteredEvents.length} onPage={eventPagination.setPage} />
          ) : null}
        </EntityPanel>
      ) : null}

      {tab === "clubs" ? (
        <EntityPanel
          title="Student clubs"
          description="Technical, cultural, sports, and interest-based student clubs."
          count={filteredClubs.length}
          addLabel="Add club"
          onAdd={() => setDialog({ kind: "club", record: null })}
          onExport={() =>
            exportCsv(
              "clubs.csv",
              ["Name", "Category", "Coordinator", "President", "Members", "Status"],
              filteredClubs.map((c) => [c.name, c.category, c.coordinator, c.president, c.members, c.status]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search clubs by name, coordinator, or president…"
          onClearFilters={() => setClubFilter({ category: "", status: "" })}
          filters={
            <>
              <EntityFilterSelect label="Category" value={clubFilter.category} options={[{ value: "technical", label: "Technical" }, { value: "coding", label: "Coding" }, { value: "ai", label: "AI" }, { value: "robotics", label: "Robotics" }, { value: "cultural", label: "Cultural" }, { value: "music", label: "Music" }, { value: "dance", label: "Dance" }, { value: "sports", label: "Sports" }, { value: "photography", label: "Photography" }, { value: "entrepreneurship", label: "Entrepreneurship" }]} onChange={(v) => setClubFilter((f) => ({ ...f, category: v }))} />
              <EntityFilterSelect label="Status" value={clubFilter.status} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onChange={(v) => setClubFilter((f) => ({ ...f, status: v }))} />
            </>
          }
        >
          {filteredClubs.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredClubs.map((c) => (
                <Card key={c.id} className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl text-sm font-semibold">{c.logoInitials}</span>
                        <div>
                          <CardTitle className="text-base">{c.name}</CardTitle>
                          <CardDescription className="capitalize">{c.category}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "outline"} className="capitalize">{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p><span className="text-muted-foreground">Coordinator:</span> {c.coordinator}</p>
                      <p><span className="text-muted-foreground">President:</span> {c.president}</p>
                      <p><span className="text-muted-foreground">Members:</span> {c.members}</p>
                    </div>
                    {c.upcomingActivities.length ? (
                      <div className="flex flex-wrap gap-1">
                        {c.upcomingActivities.map((activity) => <Badge key={activity} variant="outline">{activity}</Badge>)}
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "club", record: c })}><Pencil aria-hidden="true" />Edit</Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete club" onClick={() => setDeleteTarget({ kind: "clubs", id: c.id, label: c.name })}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No clubs" description="Add a student club to get started." titleAs="h3" />
          )}
        </EntityPanel>
      ) : null}

      {tab === "gallery" ? (
        <EntityPanel
          title="Campus gallery"
          description="Albums of campus memories, events, and achievements."
          count={filteredAlbums.length}
          addLabel="Create album"
          onAdd={() => setDialog({ kind: "album", record: null })}
          onImport={importNotice}
          onExport={() =>
            exportCsv(
              "gallery.csv",
              ["Album", "Category", "Photos", "Videos", "Date"],
              filteredAlbums.map((a) => [a.title, a.category, a.photos, a.videos, a.date]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search albums by title…"
          onClearFilters={() => setGalleryFilter({ category: "" })}
          filters={
            <EntityFilterSelect label="Category" value={galleryFilter.category} options={[{ value: "event", label: "Event Memories" }, { value: "convocation", label: "Convocation" }, { value: "sports", label: "Sports" }, { value: "festivals", label: "Festivals" }, { value: "placements", label: "Placements" }, { value: "workshops", label: "Workshops" }, { value: "achievements", label: "Achievements" }]} onChange={(v) => setGalleryFilter({ category: v })} />
          }
        >
          {filteredAlbums.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAlbums.map((a) => (
                <Card key={a.id} className="bg-card/80 overflow-hidden backdrop-blur-sm" interactive>
                  <div className="from-primary/20 to-primary/5 flex h-32 items-center justify-center bg-gradient-to-br">
                    <span className="text-primary text-3xl font-semibold">{a.coverInitials}</span>
                  </div>
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{a.title}</p>
                      <Badge variant="outline" className="capitalize">{a.category}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{a.photos} photos · {a.videos} videos · {formatDate(a.date)}</p>
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Download album" onClick={() => window.print()}><Download aria-hidden="true" /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Share album" onClick={() => window.print()}><Share2 aria-hidden="true" /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Edit album" onClick={() => setDialog({ kind: "album", record: a })}><Pencil aria-hidden="true" /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete album" onClick={() => setDeleteTarget({ kind: "gallery", id: a.id, label: a.title })}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No albums" description="Create a gallery album to organize campus media." titleAs="h3" />
          )}
        </EntityPanel>
      ) : null}

      {tab === "news" ? (
        <EntityPanel
          title="News & achievements"
          description="Institution news, student and faculty achievements, and highlights."
          count={filteredNews.length}
          addLabel="Add news"
          onAdd={() => setDialog({ kind: "news", record: null })}
          onExport={() =>
            exportCsv(
              "news.csv",
              ["Title", "Type", "Department", "Date", "Summary"],
              filteredNews.map((n) => [n.title, n.type, n.department, n.date, n.summary]),
            )
          }
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search news by title or summary…"
          onClearFilters={() => setNewsFilter({ type: "" })}
          filters={
            <EntityFilterSelect label="Type" value={newsFilter.type} options={[{ value: "news", label: "Institution News" }, { value: "student-achievement", label: "Student Achievement" }, { value: "faculty-achievement", label: "Faculty Achievement" }, { value: "research", label: "Research" }, { value: "placement", label: "Placement" }, { value: "award", label: "Award" }, { value: "ranking", label: "Ranking" }, { value: "competition", label: "Competition" }]} onChange={(v) => setNewsFilter({ type: v })} />
          }
        >
          {filteredNews.length ? (
            <div className="grid gap-3">
              {filteredNews.map((n) => (
                <Card key={n.id} className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{newsTypeLabel(n.type)}</Badge>
                        <p className="font-medium">{n.title}</p>
                      </div>
                      <p className="text-muted-foreground text-sm">{n.summary}</p>
                      <p className="text-muted-foreground mt-2 text-xs">{n.department} · {formatDate(n.date)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Edit news" onClick={() => setDialog({ kind: "news", record: n })}><Pencil aria-hidden="true" /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete news" onClick={() => setDeleteTarget({ kind: "news", id: n.id, label: n.title })}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No news" description="Publish institution news and achievements." titleAs="h3" />
          )}
        </EntityPanel>
      ) : null}

      {tab === "calendar" ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Campus calendar</CardTitle>
            <CardDescription>Events, examinations, holidays, and news across the campus.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-3 border-s pl-6">
              {calendarEntries.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="bg-primary absolute -start-[1.7rem] top-1.5 size-3 rounded-full ring-4 ring-background" aria-hidden="true" />
                  <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-medium">{entry.title}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(entry.date)}</p>
                    </div>
                    <Badge variant="outline" className={entry.tone}>{entry.kind}</Badge>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <CampusEventDrawer
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => { if (!open) setSelectedEventId(null); }}
        onEdit={(event) => setDialog({ kind: "event", record: event })}
        onRegister={(event) => store.registerEvent(event.id)}
        onCancelRegistration={(event) => store.cancelRegistration(event.id)}
      />

      {dialog?.kind === "announcement" ? (
        <AnnouncementDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertAnnouncement} />
      ) : null}
      {dialog?.kind === "event" ? (
        <EventDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertEvent} />
      ) : null}
      {dialog?.kind === "club" ? (
        <ClubDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertClub} />
      ) : null}
      {dialog?.kind === "album" ? (
        <AlbumDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertAlbum} />
      ) : null}
      {dialog?.kind === "news" ? (
        <NewsDialog key={dialog.record?.id ?? "new"} record={dialog.record} open onOpenChange={(open) => { if (!open) setDialog(null); }} onSave={store.upsertNews} />
      ) : null}

      <CampusNotificationDialog open={notifyOpen} onOpenChange={setNotifyOpen} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete record"
        description={`Delete ${deleteTarget?.label ?? "this record"}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
