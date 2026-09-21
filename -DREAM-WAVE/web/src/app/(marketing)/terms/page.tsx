import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms",
  description: "Dream Wave terms overview",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="container-app flex-1 py-16 outline-none" tabIndex={-1}>
      <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty">
        By using Dream Wave you agree to use the platform responsibly for
        learning and organizational development. Enterprise agreements and
        formal terms can be published on this route without reshaping the
        frontend architecture.
      </p>
      <Link
        href={ROUTES.home}
        className={cn(buttonVariants({ variant: "outline" }), "mt-8 inline-flex h-10")}
      >
        Back to home
      </Link>
    </main>
  );
}
