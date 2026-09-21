"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LEARN_ROUTES } from "@/constants/learn";
import { cn } from "@/lib/utils";
import { useLearnStore } from "@/store/learn-store";
import type { LearnAnimation } from "@/types/learn";

export function LearnPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-muted-foreground text-sm">Adaptive Learning</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function AnimationCard({
  animation,
  progress,
}: {
  animation: LearnAnimation;
  progress?: number;
}) {
  const favorites = useLearnStore((s) => s.favorites);
  const toggleFavorite = useLearnStore((s) => s.toggleFavorite);
  const isFavorite = favorites.includes(animation.id);

  return (
    <Card className="relative h-full overflow-hidden">
      <CardHeader>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="text-3xl" aria-hidden="true">
            {animation.cover}
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={isFavorite ? "Remove favorite" : "Favorite animation"}
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(animation.id);
            }}
          >
            <Heart
              className={cn(
                "size-4",
                isFavorite && "fill-current text-rose-500",
              )}
            />
          </Button>
        </div>
        <CardTitle className="text-base leading-snug">
          <Link
            href={LEARN_ROUTES.detail(animation.id)}
            className="hover:underline focus-visible:ring-ring rounded outline-none focus-visible:ring-2"
          >
            {animation.title}
          </Link>
        </CardTitle>
        <CardDescription>
          {animation.subject} · {animation.topic} · {animation.level}
        </CardDescription>
        <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
          {animation.description}
        </p>
        {typeof progress === "number" ? (
          <div className="mt-3">
            <div className="text-muted-foreground mb-1 flex justify-between text-xs">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function AnimationGrid({
  items,
  progressMap,
}: {
  items: LearnAnimation[];
  progressMap?: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((animation) => (
        <AnimationCard
          key={animation.id}
          animation={animation}
          {...(progressMap?.[animation.id] !== undefined
            ? { progress: progressMap[animation.id] }
            : {})}
        />
      ))}
    </div>
  );
}

export function AnimationSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="border-border bg-muted/40 h-44 animate-pulse rounded-2xl border"
        />
      ))}
    </div>
  );
}
