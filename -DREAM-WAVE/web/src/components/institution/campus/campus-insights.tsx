"use client";

import {
  CalendarDays,
  Download,
  Image as ImageIcon,
  Megaphone,
  Printer,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { exportCsv } from "@/components/institution/academics/academic-ui";
import { categoryLabel } from "@/components/institution/campus/campus-ui";
import {
  InstitutionBarChart,
  InstitutionDistributionChart,
  InstitutionLineChart,
} from "@/components/institution/institution-dashboard-ui";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCampusManagementStore } from "@/store/campus-management-store";
import type { EventCategory } from "@/types/campus-management";

function useHydratedCampus() {
  const hydrated = useCampusManagementStore((s) => s.hydrated);
  const hydrate = useCampusManagementStore((s) => s.hydrate);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
  return hydrated;
}

export function CampusAnalyticsPage() {
  const hydrated = useHydratedCampus();
  const events = useCampusManagementStore((s) => s.events);
  const clubs = useCampusManagementStore((s) => s.clubs);
  const announcements = useCampusManagementStore((s) => s.announcements);
  const albums = useCampusManagementStore((s) => s.albums);

  const analytics = useMemo(() => {
    const categories: EventCategory[] = [
      "workshop",
      "seminar",
      "hackathon",
      "festival",
      "sports",
      "conference",
    ];
    const topEvents = [...events]
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 6);
    return {
      months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      participation: [320, 540, 610, 720, 880, 960],
      categories: categories.map(categoryLabel),
      categoryValues: categories.map(
        (category) => events.filter((e) => e.category === category).length,
      ),
      topEventLabels: topEvents.map((e) => e.bannerInitials),
      topEventValues: topEvents.map((e) => e.registered),
      clubGrowth: [1800, 2050, 2260, 2480, 2610, clubs.reduce((sum, c) => sum + c.members, 0)],
      announcementLabels: announcements.slice(0, 6).map((a) => a.title.slice(0, 12) + "…"),
      announcementViews: announcements.slice(0, 6).map((a) => a.views),
      galleryLabels: albums.map((a) => a.title.slice(0, 10)),
      galleryEngagement: albums.map((a) => a.photos + a.videos * 10),
    };
  }, [albums, announcements, clubs, events]);

  if (!hydrated) return <RouteLoading label="Loading campus analytics" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Campus Experience"
        title="Campus Analytics"
        description="Event participation, club growth, announcement reach, and gallery engagement."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <InstitutionLineChart title="Event Participation" description="Monthly student participation trend." labels={analytics.months} values={analytics.participation} />
        <InstitutionBarChart title="Popular Events" description="Registrations across leading events." labels={analytics.topEventLabels} values={analytics.topEventValues} />
        <InstitutionBarChart title="Events by Category" description="Event distribution across categories." labels={analytics.categories} values={analytics.categoryValues} />
        <InstitutionLineChart title="Club Growth" description="Total club membership over time." labels={analytics.months} values={analytics.clubGrowth} />
        <InstitutionBarChart title="Announcement Views" description="Reach across recent announcements." labels={analytics.announcementLabels} values={analytics.announcementViews} />
        <InstitutionDistributionChart title="Gallery Engagement" description="Engagement across gallery albums." labels={analytics.galleryLabels} values={analytics.galleryEngagement} />
      </div>
    </div>
  );
}

export function CampusReportsPage() {
  const hydrated = useHydratedCampus();
  const events = useCampusManagementStore((s) => s.events);
  const clubs = useCampusManagementStore((s) => s.clubs);
  const announcements = useCampusManagementStore((s) => s.announcements);
  const albums = useCampusManagementStore((s) => s.albums);

  const reports = useMemo(
    () => [
      {
        title: "Event Reports",
        description: "Complete campus event register.",
        icon: CalendarDays,
        count: events.length,
        export: () =>
          exportCsv(
            "event-report.csv",
            ["Title", "Category", "Date", "Venue", "Capacity", "Registered", "Status"],
            events.map((e) => [e.title, e.category, e.date, e.venue, e.capacity, e.registered, e.status]),
          ),
      },
      {
        title: "Participation Reports",
        description: "Registration and fill-rate by event.",
        icon: Users,
        count: events.reduce((sum, e) => sum + e.registered, 0),
        export: () =>
          exportCsv(
            "participation-report.csv",
            ["Title", "Registered", "Capacity", "Fill %"],
            events.map((e) => [e.title, e.registered, e.capacity, e.capacity ? Math.round((e.registered / e.capacity) * 100) : 0]),
          ),
      },
      {
        title: "Announcement Reach",
        description: "Views and audience by announcement.",
        icon: Megaphone,
        count: announcements.reduce((sum, a) => sum + a.views, 0),
        export: () =>
          exportCsv(
            "announcement-reach.csv",
            ["Title", "Category", "Audience", "Priority", "Views", "Status"],
            announcements.map((a) => [a.title, a.category, a.audience, a.priority, a.views, a.status]),
          ),
      },
      {
        title: "Gallery Usage",
        description: "Photo and video counts by album.",
        icon: ImageIcon,
        count: albums.reduce((sum, a) => sum + a.photos + a.videos, 0),
        export: () =>
          exportCsv(
            "gallery-usage.csv",
            ["Album", "Category", "Photos", "Videos", "Date"],
            albums.map((a) => [a.title, a.category, a.photos, a.videos, a.date]),
          ),
      },
      {
        title: "Club Activity Reports",
        description: "Membership and activity by club.",
        icon: Users,
        count: clubs.length,
        export: () =>
          exportCsv(
            "club-activity-report.csv",
            ["Club", "Category", "Coordinator", "President", "Members", "Status"],
            clubs.map((c) => [c.name, c.category, c.coordinator, c.president, c.members, c.status]),
          ),
      },
    ],
    [albums, announcements, clubs, events],
  );

  const printReports = useCallback(() => window.print(), []);

  if (!hydrated) return <RouteLoading label="Loading campus reports" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Campus Experience"
        title="Campus Reports"
        description="Generate event, participation, announcement, gallery, and club reports."
        actions={
          <Button type="button" variant="outline" onClick={printReports}>
            <Printer aria-hidden="true" />
            Print
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-3xl font-semibold">{report.count}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={report.export}>
                    <Download aria-hidden="true" />
                    Export Excel
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={printReports}>
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
