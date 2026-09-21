"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROUTES } from "@/constants/routes";

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  goals: "Goals",
  tasks: "Tasks",
  mentor: "AI Mentor",
  roadmap: "Roadmap",
  books: "Smart Library",
  reports: "Reports",
  settings: "Settings",
  ai: "AI Studio",
  learn: "Adaptive Learning",
  workspace: "Smart Workspace",
  institution: "Institution",
  library: "Library",
  search: "Discover",
  explorer: "Explorer",
  favorites: "Favorites",
  history: "History",
  analytics: "Analytics",
  notes: "Notes",
  calendar: "Calendar",
  focus: "Focus",
  insights: "Insights",
  read: "Reader",
  watch: "Watch",
  teacher: "Teacher",
  career: "Career",
  resume: "Resume",
  onboarding: "Onboarding",
  community: "Community",
  discussions: "Discussions",
  messages: "Messages",
  mentors: "Mentors",
  teams: "Teams",
  groups: "Groups",
  projects: "Projects",
  communities: "Communities",
  research: "Research",
  interview: "Interview",
  jobs: "Jobs",
  personal: "Personal",
  company: "Company",
  public: "Public",
  students: "Students",
  teachers: "Teachers",
  departments: "Departments",
  courses: "Courses",
  subjects: "Subjects",
  classes: "Classes",
  branches: "Branches",
  members: "Members",
  notifications: "Notifications",
  profile: "Profile",
  school: "School",
  college: "College",
};

export function PlatformBreadcrumbs() {
  const pathname = usePathname();

  const items = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [];

    const crumbs: Array<{ label: string; href?: string }> = [
      { label: "Home", href: ROUTES.dashboard },
    ];
    let href = "";
    for (const part of parts) {
      href += `/${part}`;
      crumbs.push({
        label: LABEL_MAP[part] || part.replace(/-/g, " "),
        href,
      });
    }
    return crumbs.map((item, index) =>
      index === crumbs.length - 1
        ? { label: item.label }
        : { label: item.label, ...(item.href ? { href: item.href } : {}) },
    );
  }, [pathname]);

  if (items.length <= 1) return null;

  return (
    <div className="border-border border-b px-3 py-2 sm:px-4 md:px-6">
      <Breadcrumbs items={items} />
    </div>
  );
}
