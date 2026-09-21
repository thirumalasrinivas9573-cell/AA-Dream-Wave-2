"use client";

import { Badge } from "@/components/ui/badge";
import { EVENT_TYPE_LABELS, FUNDING_TYPE_LABELS, MENTOR_TYPE_LABELS, STAGE_LABELS } from "@/types/incubation-management";

export function IncubationStageBadge({ stage }: { stage: string }) {
  return <Badge variant="secondary">{STAGE_LABELS[stage] ?? stage.replace(/_/g, " ")}</Badge>;
}

export function MentorTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{MENTOR_TYPE_LABELS[type] ?? type}</Badge>;
}

export function FundingTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{FUNDING_TYPE_LABELS[type] ?? type.replace(/_/g, " ")}</Badge>;
}

export function EventTypeBadge({ type }: { type: string }) {
  return <Badge variant="secondary">{EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ")}</Badge>;
}

export function formatIncubationDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatFundingAmount(amount?: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export const INCUBATION_STAGE_FLOW = [
  "idea_evaluation",
  "pre_incubation",
  "incubation",
  "mentorship",
  "prototype_development",
  "product_validation",
  "investor_readiness",
  "graduation",
] as const;

export function nextIncubationStage(current: string): string | null {
  const idx = INCUBATION_STAGE_FLOW.indexOf(current as (typeof INCUBATION_STAGE_FLOW)[number]);
  if (idx < 0 || idx >= INCUBATION_STAGE_FLOW.length - 1) return null;
  return INCUBATION_STAGE_FLOW[idx + 1] ?? null;
}
