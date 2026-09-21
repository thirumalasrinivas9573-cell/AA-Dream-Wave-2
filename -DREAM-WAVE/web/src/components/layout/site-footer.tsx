import Link from "next/link";

import { SiteLogo } from "@/components/layout/site-logo";
import {
  APP_NAME,
  FOOTER_CONTACT,
  FOOTER_LEGAL_LINKS,
  FOOTER_LINK_GROUPS,
  FOOTER_SOCIAL_LINKS,
} from "@/constants";
import { cn } from "@/lib/utils";

type SocialNetwork = (typeof FOOTER_SOCIAL_LINKS)[number]["network"];

function SocialGlyph({
  network,
  className,
}: {
  network: SocialNetwork;
  className?: string;
}) {
  const classes = cn("size-4", className);

  if (network === "linkedin") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={classes}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }

  if (network === "youtube") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={classes}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M23.498 6.186a2.994 2.994 0 00-2.107-2.12C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.391.52A2.994 2.994 0 00.502 6.186 31.39 31.39 0 000 12a31.39 31.39 0 00.502 5.814 2.994 2.994 0 002.107 2.12c1.886.52 9.391.52 9.391.52s7.505 0 9.391-.52a2.994 2.994 0 002.107-2.12A31.39 31.39 0 0024 12a31.39 31.39 0 00-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={classes}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.833L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

/**
 * Marketing footer — navigation, resources, legal, and contact.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-muted/30 mt-auto border-t">
      <div className="container-app grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <SiteLogo />
          <p className="text-muted-foreground max-w-xs text-sm text-pretty">
            Enterprise AI learning for students, educators, institutions, and
            businesses.
          </p>
          <div>
            <p className="text-foreground text-sm font-medium">
              {FOOTER_CONTACT.label}
            </p>
            <a
              href={`mailto:${FOOTER_CONTACT.email}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1 inline-flex text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {FOOTER_CONTACT.email}
            </a>
          </div>
          <ul className="flex items-center gap-2" aria-label="Social media">
            {FOOTER_SOCIAL_LINKS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <SocialGlyph network={item.network} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-foreground mb-3 text-sm font-semibold tracking-tight">
              {group.title}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-border container-app flex flex-col gap-4 border-t py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          © {year} {APP_NAME}. All rights reserved.
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FOOTER_LEGAL_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
