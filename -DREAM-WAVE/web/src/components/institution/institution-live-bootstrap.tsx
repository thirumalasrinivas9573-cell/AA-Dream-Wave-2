"use client";

import { useEffect } from "react";

import { clearInstitutionDemoCache } from "@/lib/clear-institution-demo-cache";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";

/**
 * One-time purge of browser demo datasets when live backend mode is active.
 */
export function InstitutionLiveBootstrap() {
  useEffect(() => {
    if (isInstitutionDemoDataEnabled()) return;
    clearInstitutionDemoCache();
  }, []);

  return null;
}
