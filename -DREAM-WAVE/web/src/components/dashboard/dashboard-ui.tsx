"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const SmartStatCard = memo(function SmartStatCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
}) {
  return (
    <Card interactive className="min-w-0 overflow-hidden">
      <CardHeader className="min-w-0">
        <CardDescription className="truncate">{label}</CardDescription>
        <CardTitle className="truncate text-3xl tabular-nums">{value}</CardTitle>
        {hint || trend ? (
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {trend ? <span className="text-foreground font-medium">{trend}</span> : null}
            {trend && hint ? " · " : null}
            {hint}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
});

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          {...(label ? { "aria-label": label } : {})}
        />
      </div>
    </div>
  );
}

export function MiniBarChart({
  values,
  labels,
  className,
}: {
  values: number[];
  labels?: string[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div
      className={cn("flex h-32 items-end gap-2", className)}
      role="img"
      aria-label="Bar chart"
    >
      {values.map((value, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="bg-primary/80 hover:bg-primary w-full rounded-t-md transition-[height,background-color] duration-300 ease-out motion-reduce:transition-none"
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
            title={String(value)}
          />
          {labels?.[index] ? (
            <span className="text-muted-foreground truncate text-[10px]">
              {labels[index]}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("text-primary h-16 w-full", className)}
      role="img"
      aria-label="Trend sparkline"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{ id: string; title: string; detail: string; time: string }>;
}) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground text-sm">No recent activity yet.</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="bg-primary absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full" />
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-muted-foreground text-xs text-pretty">{item.detail}</p>
          <p className="text-muted-foreground mt-1 text-[11px]">{item.time}</p>
        </li>
      ))}
    </ol>
  );
}

export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const ContinueCard = memo(function ContinueCard({
  href,
  title,
  meta,
  progress,
  badge,
}: {
  href: string;
  title: string;
  meta: string;
  progress?: number;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring group rounded-2xl outline-none focus-visible:ring-2"
    >
      <Card interactive className="group-hover:bg-muted/25 h-full">
        <CardHeader>
          <div className="mb-1 flex items-start justify-between gap-2">
            <CardTitle className="text-base transition-colors group-hover:text-primary">
              {title}
            </CardTitle>
            {badge ? <Badge variant="muted">{badge}</Badge> : null}
          </div>
          <CardDescription>{meta}</CardDescription>
          {typeof progress === "number" ? (
            <ProgressBar value={progress} className="mt-3" />
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  );
});

export function ExportButton({
  label = "Export",
  onClick,
}: {
  label?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9"
      onClick={onClick}
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function SimplePagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">
        Page {page} of {Math.max(pageCount, 1)}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-auto w-full flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal",
      )}
    >
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-xs font-normal">
        {description}
      </span>
    </Link>
  );
}
