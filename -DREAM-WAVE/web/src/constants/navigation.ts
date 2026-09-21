/**
 * Marketing navigation and footer link constants.
 */

export const MARKETING_NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Platform", href: "#platform" },
  { label: "Discover", href: "/institutions" },
  { label: "AI", href: "#ai-showcase" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
] as const;

export const DISCOVERY_ROUTES = {
  explore: "/institutions",
  compare: "/institutions/compare",
  profile: (slug: string) => `/institutions/${slug}`,
} as const;

export const MARKETING_AUTH_ROUTES = {
  login: "/login",
  getStarted: "/register",
} as const;

export const FOOTER_LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Platform overview", href: "#platform" },
      { label: "AI Platform", href: "#ai-showcase" },
      { label: "Pricing", href: "#pricing" },
      { label: "Get started", href: "#cta" },
    ],
  },
  {
    title: "Learning",
    links: [
      { label: "Books & knowledge", href: "#books" },
      { label: "Animation studio", href: "#animation" },
      { label: "Institutions", href: "#institutions" },
      { label: "Companies", href: "#companies" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "#contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export const FOOTER_SOCIAL_LINKS = [
  { label: "LinkedIn", href: "#", network: "linkedin" },
  { label: "X", href: "#", network: "x" },
  { label: "YouTube", href: "#", network: "youtube" },
] as const;

export const FOOTER_CONTACT = {
  email: "hello@dreamwave.ai",
  label: "Contact",
} as const;
