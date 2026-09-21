"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { searchApi } from "@/lib/api/search";

type Props = {
  resultId: string;
  query?: string;
};

export function SearchFeedbackBar({ resultId, query }: Props) {
  const { token } = useAuth();
  const [sent, setSent] = useState(false);

  const submit = async (feedback: string) => {
    if (!token) return;
    await searchApi.feedback(token, { resultId, feedback, ...(query ? { query } : {}) });
    setSent(true);
  };

  if (sent) return <p className="text-muted-foreground text-xs">Feedback recorded.</p>;

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Search result feedback">
      <Button size="sm" variant="ghost" onClick={() => void submit("HELPFUL")}>Helpful</Button>
      <Button size="sm" variant="ghost" onClick={() => void submit("NOT_HELPFUL")}>Not helpful</Button>
      <Button size="sm" variant="ghost" onClick={() => void submit("NOT_RELEVANT")}>Not relevant</Button>
    </div>
  );
}
