"use client";

import type { ReactNode } from "react";

import { InstitutionGate } from "@/components/institution/institution-gate";
import { InstitutionLiveBootstrap } from "@/components/institution/institution-live-bootstrap";
import { InstitutionShell } from "@/components/institution/institution-shell";

type InstitutionLayoutProps = {
  children: ReactNode;
};

export default function InstitutionSectionLayout({
  children,
}: InstitutionLayoutProps) {
  return (
    <InstitutionGate>
      <InstitutionLiveBootstrap />
      <InstitutionShell>{children}</InstitutionShell>
    </InstitutionGate>
  );
}
