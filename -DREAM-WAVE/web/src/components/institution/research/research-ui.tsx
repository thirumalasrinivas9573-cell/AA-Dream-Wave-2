"use client";

import { Badge } from "@/components/ui/badge";
import {
  IDEA_STATUS_LABELS,
  IDEA_TYPE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/types/research-management";

export function ProjectStatusBadge({ status }: { status: string }) {
  const label = PROJECT_STATUS_LABELS[status] ?? status;
  const variant =
    status === "active"
      ? "default"
      : status === "completed"
        ? "secondary"
        : status === "archived"
          ? "outline"
          : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

export function OpportunityTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{OPPORTUNITY_TYPE_LABELS[type] ?? type}</Badge>;
}

export function IdeaTypeBadge({ type }: { type: string }) {
  return <Badge variant="secondary">{IDEA_TYPE_LABELS[type] ?? type}</Badge>;
}

export function IdeaStatusBadge({ status }: { status: string }) {
  const variant =
    status === "approved" || status === "incubating"
      ? "default"
      : status === "rejected"
        ? "outline"
        : "secondary";
  return <Badge variant={variant}>{IDEA_STATUS_LABELS[status] ?? status}</Badge>;
}

export function formatResearchDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
