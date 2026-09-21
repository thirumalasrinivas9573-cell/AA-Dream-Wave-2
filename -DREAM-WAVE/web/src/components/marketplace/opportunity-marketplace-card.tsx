"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MarketplaceOpportunityItem = {
  id: string;
  source: string;
  title: string;
  kind?: string;
  organizer?: string;
  status?: string;
  deadline?: string;
  matchCategory?: string;
  matchLevel?: string;
  quality?: { level: string; missing?: string[] };
  deadlineState?: string;
  institutionRelevance?: {
    relevance: string;
    score: number;
    matchedSkills?: string[];
    reasons?: string[];
  };
  requiredSkills?: string[];
};

type Props = {
  item: MarketplaceOpportunityItem;
  compareSelected?: boolean;
  onCompareToggle?: (item: MarketplaceOpportunityItem) => void;
  showRelevance?: boolean;
};

function qualityVariant(level?: string): "default" | "secondary" | "outline" {
  if (level === "COMPLETE" || level === "GOOD") return "default";
  if (level === "PARTIAL") return "secondary";
  return "outline";
}

function deadlineVariant(state?: string): "default" | "secondary" | "outline" {
  if (state === "URGENT") return "default";
  if (state === "APPROACHING") return "secondary";
  return "outline";
}

export function OpportunityMarketplaceCard({
  item,
  compareSelected,
  onCompareToggle,
  showRelevance = false,
}: Props) {
  const detailHref = `/opportunities/${item.source}/${item.id}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {item.organizer || "Organization unknown"} · {item.kind?.replace(/_/g, " ") || item.source}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {item.quality?.level ? (
              <Badge variant={qualityVariant(item.quality.level)}>{item.quality.level}</Badge>
            ) : null}
            {item.deadlineState ? (
              <Badge variant={deadlineVariant(item.deadlineState)}>{item.deadlineState}</Badge>
            ) : null}
            {item.matchCategory ? (
              <Badge variant="outline">{item.matchCategory.replace(/_/g, " ")}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showRelevance && item.institutionRelevance ? (
          <div className="text-sm">
            <p className="font-medium">
              {item.institutionRelevance.relevance} relevance
              {item.institutionRelevance.score > 0 ? ` · ${item.institutionRelevance.score}% alignment` : ""}
            </p>
            {item.institutionRelevance.reasons?.length ? (
              <p className="text-muted-foreground mt-1 text-xs">{item.institutionRelevance.reasons[0]}</p>
            ) : null}
          </div>
        ) : null}

        {item.requiredSkills?.length ? (
          <p className="text-muted-foreground text-xs">
            Skills: {item.requiredSkills.slice(0, 4).join(", ")}
            {item.requiredSkills.length > 4 ? "…" : ""}
          </p>
        ) : null}

        {item.deadline ? (
          <p className="text-muted-foreground text-xs">
            Deadline: {new Date(item.deadline).toLocaleDateString()}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={detailHref} className={buttonVariants({ size: "sm" })}>
            View details
          </Link>
          {item.status ? <Badge variant="secondary">{item.status}</Badge> : null}
          {onCompareToggle ? (
            <Button
              size="sm"
              variant={compareSelected ? "default" : "outline"}
              onClick={() => onCompareToggle(item)}
              aria-pressed={compareSelected}
            >
              {compareSelected ? "Selected" : "Compare"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
