import type { ReactNode } from "react";

import { OfflineBanner } from "@/components/layout/offline-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteNavbar } from "@/components/layout/site-navbar";

type MarketingLayoutProps = {
  children: ReactNode;
};

/**
 * Public marketing shell: global navigation + footer.
 */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div data-layout="marketing" className="flex min-h-full flex-1 flex-col">
      <OfflineBanner />
      <SiteNavbar />
      {children}
      <SiteFooter />
    </div>
  );
}
