"use client";

import type { ReactNode } from "react";

import { PageTransition } from "@/components/common/page-transition";

export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
