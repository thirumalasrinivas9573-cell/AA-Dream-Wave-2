"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LearnNav } from "@/components/learn/learn-nav";
import {
  AnimationGrid,
  LearnPageHeader,
} from "@/components/learn/learn-shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEARN_ROUTES, LEARN_SUBJECTS, LEARN_TOPICS } from "@/constants/learn";
import { LEARN_CATALOG } from "@/constants/learn-catalog";
import { cn } from "@/lib/utils";
import { useLearnStore } from "@/store/learn-store";

export function LearnLibraryPage({
  subjectFilter,
}: {
  subjectFilter?: string;
}) {
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const progress = useLearnStore((s) => s.progress);

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [subject, setSubject] = useState(subjectFilter || "all");
  const [syncedSubjectFilter, setSyncedSubjectFilter] = useState(subjectFilter);
  if (subjectFilter !== syncedSubjectFilter) {
    setSyncedSubjectFilter(subjectFilter);
    if (subjectFilter) setSubject(subjectFilter);
  }

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.animationId] = item.percent;
    return map;
  }, [progress]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEARN_CATALOG.filter((item) => {
      if (subject !== "all" && item.subject !== subject) return false;
      if (topic !== "all" && item.topic !== topic) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.includes(q))
      );
    });
  }, [query, subject, topic]);

  const meta = LEARN_SUBJECTS.find((item) => item.id === subjectFilter);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <LearnPageHeader
        title={meta?.label ? `${meta.label} animations` : "Animation library"}
        {...(meta?.description
          ? { description: meta.description }
          : {
              description:
                "Browse by subject and topic. Filter, search, and open any lesson.",
            })}
        actions={
          <Link
            href={LEARN_ROUTES.root}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Dashboard
          </Link>
        }
      />

      <LearnNav />

      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search animations…"
          className="h-10"
          aria-label="Search animations"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={subject === "all" ? "default" : "outline"}
            onClick={() => setSubject("all")}
          >
            All subjects
          </Button>
          {LEARN_SUBJECTS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={subject === item.id ? "default" : "outline"}
              onClick={() => setSubject(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={topic === "all" ? "default" : "outline"}
            onClick={() => setTopic("all")}
          >
            All topics
          </Button>
          {LEARN_TOPICS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={topic === item.id ? "default" : "outline"}
              onClick={() => setTopic(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No animations found"
          description="Try another subject, topic, or search term."
        />
      ) : (
        <AnimationGrid items={items} progressMap={progressMap} />
      )}
    </div>
  );
}

export function LearnListsPage({ mode }: { mode: "favorites" | "history" }) {
  const hydrate = useLearnStore((s) => s.hydrate);
  const hydrated = useLearnStore((s) => s.hydrated);
  const favorites = useLearnStore((s) => s.favorites);
  const history = useLearnStore((s) => s.history);
  const progress = useLearnStore((s) => s.progress);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progress) map[item.animationId] = item.percent;
    return map;
  }, [progress]);

  const ids = mode === "favorites" ? favorites : history;
  const items = ids
    .map((id) => LEARN_CATALOG.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <LearnPageHeader
        title={mode === "favorites" ? "Favourite animations" : "Watch history"}
        description={
          mode === "favorites"
            ? "Animations you saved for quick return."
            : "Recently watched educational animations."
        }
        actions={
          <Link
            href={LEARN_ROUTES.library}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Library
          </Link>
        }
      />
      <LearnNav />
      {items.length === 0 ? (
        <EmptyState
          title={mode === "favorites" ? "No favorites yet" : "No history yet"}
          description="Open the library and start watching to populate this list."
        />
      ) : (
        <AnimationGrid items={items} progressMap={progressMap} />
      )}
    </div>
  );
}
