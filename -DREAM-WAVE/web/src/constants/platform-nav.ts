import { INSTITUTION_NAV } from "@/constants/institution";
import { COMPANY_NAV } from "@/constants/partnership";
import type { PlatformRole } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

export type PlatformNavItem = {
  label: string;
  href: string;
  primary?: boolean;
};

const STUDENT_NAV: PlatformNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, primary: true },
  { label: "Workspace", href: ROUTES.workspace },
  { label: "Goals", href: ROUTES.goals },
  { label: "Roadmap", href: ROUTES.roadmap },
  { label: "Tasks", href: ROUTES.tasks },
  { label: "AI Studio", href: ROUTES.ai },
  { label: "AI Mentor", href: ROUTES.mentor },
  { label: "Research", href: ROUTES.research },
  { label: "Community", href: ROUTES.community },
  { label: "Opportunities", href: ROUTES.opportunities },
  { label: "Marketplace", href: ROUTES.marketplace },
  { label: "Events", href: ROUTES.events },
  { label: "Learn", href: ROUTES.learn },
  { label: "Smart Library", href: ROUTES.books },
  { label: "Discover", href: "/books/search" },
  { label: "Reports", href: ROUTES.reports },
  { label: "Settings", href: ROUTES.settings },
];

const INSTITUTION_NAV_ITEMS: PlatformNavItem[] = INSTITUTION_NAV.map((item) => {
  const entry: PlatformNavItem = {
    label: item.label,
    href: item.href,
  };
  if ("primary" in item && item.primary) {
    entry.primary = true;
  }
  return entry;
});

const COMPANY_NAV_ITEMS: PlatformNavItem[] = COMPANY_NAV.map((item) => {
  const entry: PlatformNavItem = {
    label: item.label,
    href: item.href,
  };
  if ("primary" in item && item.primary) {
    entry.primary = true;
  }
  return entry;
});

const ADMIN_NAV: PlatformNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, primary: true },
  { label: "Settings", href: ROUTES.settings },
];

export function getPlatformNav(
  role: PlatformRole | null | undefined,
): PlatformNavItem[] {
  switch (role) {
    case "institution":
      return INSTITUTION_NAV_ITEMS;
    case "company":
      return COMPANY_NAV_ITEMS;
    case "admin":
      return ADMIN_NAV;
    case "student":
    default:
      return STUDENT_NAV;
  }
}
