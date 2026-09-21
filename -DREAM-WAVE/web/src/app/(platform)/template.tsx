"use client";

import type { ReactNode } from "react";

import { PageTransition } from "@/components/common/page-transition";

type PlatformTemplateProps = {
  children: ReactNode;
};

/**
 * Remounts on navigation to provide polished page enter transitions.
 */
export default function PlatformTemplate({ children }: PlatformTemplateProps) {
  return <PageTransition>{children}</PageTransition>;
}
