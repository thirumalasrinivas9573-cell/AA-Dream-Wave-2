"use client";

import { Badge } from "@/components/ui/badge";
import {
  CONTRIBUTION_TYPE_LABELS,
  MENTORSHIP_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/types/alumni-management";

export function VerificationBadge({ status }: { status?: string }) {
  const label = VERIFICATION_LABELS[status || "pending"] || status || "Pending";
  const variant = status === "verified" ? "default" : status === "rejected" ? "secondary" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

export function MentorshipStatusBadge({ status }: { status?: string }) {
  const label = MENTORSHIP_STATUS_LABELS[status || "requested"] || status || "Requested";
  return <Badge variant="outline">{label}</Badge>;
}

export function ContributionTypeBadge({ type }: { type?: string }) {
  const label = CONTRIBUTION_TYPE_LABELS[type || ""] || type || "Contribution";
  return <Badge variant="secondary">{label}</Badge>;
}

export function formatAlumniDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
