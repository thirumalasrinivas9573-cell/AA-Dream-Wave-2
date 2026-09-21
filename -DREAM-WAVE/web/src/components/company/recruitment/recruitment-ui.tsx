"use client";

import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/types/recruitment";

export function StageBadge({ stage }: { stage: string }) {
  const label = STAGE_LABELS[stage] ?? stage;
  const variant =
    stage === "hired" || stage === "offer_accepted"
      ? "default"
      : stage === "rejected" || stage === "withdrawn"
        ? "outline"
        : stage === "shortlisted" || stage === "selected"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{label}</Badge>;
}

export function candidateName(app: {
  candidateSnapshot?: { name?: string };
}) {
  return app.candidateSnapshot?.name || "Candidate";
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
