import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Dream Wave privacy overview",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="container-app flex-1 py-16 outline-none" tabIndex={-1}>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty">
        Dream Wave treats learner data with care. Account details, learning
        progress, and AI conversation history are used to personalize the
        experience and operate the platform. Full legal policy copy can be
        connected here without changing product architecture.
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
