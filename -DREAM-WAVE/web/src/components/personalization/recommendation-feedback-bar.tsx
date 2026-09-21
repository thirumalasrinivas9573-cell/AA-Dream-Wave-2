"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { personalizationApi } from "@/lib/api/personalization";

type Props = {
  recommendationKey: string;
  recommendationType?: string;
  onFeedback?: () => void;
};

export function RecommendationFeedbackBar({ recommendationKey, recommendationType, onFeedback }: Props) {
  const { token } = useAuth();
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (feedback: string) => {
    if (!token || busy) return;
    setBusy(true);
    try {
      await personalizationApi.recordFeedback(token, {
        recommendationKey,
        feedback,
        ...(recommendationType ? { recommendationType } : {}),
      });
      setSent(feedback);
      onFeedback?.();
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <p className="text-muted-foreground text-xs">Feedback recorded — thanks.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Recommendation feedback">
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void submit("HELPFUL")}>
        Helpful
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void submit("NOT_HELPFUL")}>
        Not helpful
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void submit("NOT_RELEVANT")}>
        Not relevant
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void submit("DISMISS")}>
        Dismiss
      </Button>
    </div>
  );
}
