/**
 * Application route path constants.
 */

export const ROUTES = {
  home: "/",
  notFound: "/404",
  dashboard: "/dashboard",
  settings: "/settings",
  onboarding: "/onboarding",
  onboardingDetails: "/onboarding/details",
  goals: "/goals",
  tasks: "/tasks",
  mentor: "/mentor",
  roadmap: "/roadmap",
  books: "/books",
  reports: "/reports",
  ai: "/ai",
  learn: "/learn",
  institution: "/institution",
  research: "/research",
  community: "/community",
  events: "/events",
  opportunities: "/opportunities",
  marketplace: "/marketplace",
  marketplaceCompare: "/marketplace/compare",
  notifications: "/notifications",
  workspace: "/workspace",
  personalization: "/personalization",
  search: "/search",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
