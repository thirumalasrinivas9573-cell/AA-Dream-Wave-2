"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MATCH_LEVEL_LABELS, type MatchedOpportunity } from "@/lib/api/opportunities";

type Props = {
  item: MatchedOpportunity;
  onPrepare?: (item: MatchedOpportunity) => void;
  onDismiss?: (item: MatchedOpportunity) => void;
  compact?: boolean;
};

export function OpportunityMatchCard({ item, onPrepare, onDismiss, compact = false }: Props) {
  const { match } = item;
  const levelLabel = MATCH_LEVEL_LABELS[match.matchLevel] || match.matchLevel;

  return (
    <Card className="border-border/80">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{item.kind.replace(/_/g, " ")}</Badge>
              <Badge
                variant={
                  match.matchLevel === "STRONG_MATCH" || match.matchLevel === "GOOD_MATCH"
                    ? "default"
                    : "outline"
                }
              >
                {levelLabel}
              </Badge>
              {match.matchStatus === "ALREADY_APPLIED" && (
                <Badge variant="outline">Applied</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{item.title}</CardTitle>
            <CardDescription>{item.organizer}</CardDescription>
          </div>
          {match.daysUntilDeadline !== null && match.daysUntilDeadline >= 0 && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3.5" />
              {match.daysUntilDeadline === 0
                ? "Closes today"
                : `${match.daysUntilDeadline}d left`}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {match.reasons.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Why recommended
            </p>
            <ul className="space-y-1.5">
              {match.reasons.slice(0, 4).map((reason) => (
                <li key={`${reason.type}-${reason.label}`} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{reason.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {match.missingRequirements.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Missing
            </p>
            <p className="text-sm">{match.missingRequirements.slice(0, 3).join(", ")}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ size: "sm" })} href={`/opportunities/${item.source}/${item.id}`}>
            Match analysis
          </Link>
          <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={item.href}>
            View opportunity
          </Link>
          {onPrepare && match.actionable && (
            <Button size="sm" variant="outline" onClick={() => onPrepare(item)}>
              <Sparkles className="mr-1 size-3.5" />
              Prepare
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={() => onDismiss(item)}>
              <XCircle className="mr-1 size-3.5" />
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
