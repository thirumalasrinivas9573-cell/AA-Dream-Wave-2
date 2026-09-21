"use client";

import type { ReactNode } from "react";

import { CompanyGate } from "@/components/company/company-gate";
import { CompanyShell } from "@/components/company/company-shell";

type CompanyLayoutProps = {
  children: ReactNode;
};

export default function CompanySectionLayout({ children }: CompanyLayoutProps) {
  return (
    <CompanyGate>
      <CompanyShell>{children}</CompanyShell>
    </CompanyGate>
  );
}
