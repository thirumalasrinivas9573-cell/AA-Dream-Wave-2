"use client";

import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode, useId } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChartDatum = {
  label: string;
  value: number;
};

export const InstitutionMetricCard = memo(function InstitutionMetricCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  trend?: string;
  icon: LucideIcon;
}) {
  return (
    <Card
      interactive
      className="bg-card/80 min-w-0 overflow-hidden shadow-[var(--shadow-sm)] backdrop-blur-sm"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-1 text-2xl tabular-nums sm:text-3xl">
              {value}
            </CardTitle>
          </div>
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {trend ? (
            <span className="text-primary mr-1 font-semibold">{trend}</span>
          ) : null}
          {hint}
        </p>
      </CardHeader>
    </Card>
  );
});

function ChartFrame({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("bg-card/80 min-w-0 backdrop-blur-sm", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function InstitutionBarChart({
  title,
  description,
  labels,
  values,
  className,
}: {
  title: string;
  description: string;
  labels: readonly string[];
  values: readonly number[];
  className?: string;
}) {
  const titleId = useId();
  const max = Math.max(...values, 1);
  const barWidth = Math.max(12, 180 / Math.max(values.length, 1));
  const gap = 12;

  return (
    <ChartFrame
      title={title}
      description={description}
      {...(className ? { className } : {})}
    >
      <div role="img" aria-labelledby={titleId}>
        <p id={titleId} className="sr-only">
          {title}.{" "}
          {labels.map((label, index) => `${label}: ${values[index] ?? 0}`).join(", ")}
        </p>
        <svg
          viewBox="0 0 280 120"
          className="text-primary h-44 w-full overflow-visible"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="104"
            x2="280"
            y2="104"
            className="text-border"
            stroke="currentColor"
          />
          {values.map((value, index) => {
            const height = Math.max(8, (value / max) * 88);
            const x = index * (barWidth + gap) + gap;
            return (
              <rect
                key={`${labels[index]}-${value}`}
                x={x}
                y={104 - height}
                width={barWidth}
                height={height}
                rx="5"
                fill="currentColor"
                opacity={0.82}
              />
            );
          })}
        </svg>
        <div
          className="text-muted-foreground flex gap-2 text-center text-[10px]"
          aria-hidden="true"
        >
          {labels.map((label) => (
            <span key={label} className="min-w-0 flex-1 truncate">
              {label}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

export function InstitutionLineChart({
  title,
  description,
  labels,
  values,
  className,
}: {
  title: string;
  description: string;
  labels: readonly string[];
  values: readonly number[];
  className?: string;
}) {
  const titleId = useId();
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 140 : 10 + (index / (values.length - 1)) * 260,
    y: 100 - ((value - min) / range) * 82,
    value,
  }));

  return (
    <ChartFrame
      title={title}
      description={description}
      {...(className ? { className } : {})}
    >
      <div role="img" aria-labelledby={titleId}>
        <p id={titleId} className="sr-only">
          {title}.{" "}
          {labels.map((label, index) => `${label}: ${values[index] ?? 0}`).join(", ")}
        </p>
        <svg
          viewBox="0 0 280 120"
          className="text-primary h-44 w-full overflow-visible"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <line
            x1="10"
            y1="104"
            x2="270"
            y2="104"
            className="text-border"
            stroke="currentColor"
          />
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point, index) => (
            <circle
              key={`${labels[index]}-${point.value}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="currentColor"
            />
          ))}
        </svg>
        <div className="text-muted-foreground flex justify-between gap-2 text-[10px]">
          {labels.map((label) => (
            <span key={label} className="truncate">
              {label}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

export function InstitutionDistributionChart({
  title,
  description,
  labels,
  values,
}: {
  title: string;
  description: string;
  labels: readonly string[];
  values: readonly number[];
}) {
  const data: ChartDatum[] = labels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
  const max = Math.max(...values, 1);

  return (
    <ChartFrame title={title} description={description}>
      <ul className="space-y-4">
        {data.map((item) => (
          <li key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium">{item.label}</span>
              <span className="text-muted-foreground tabular-nums">{item.value}%</span>
            </div>
            <svg
              viewBox={`0 0 ${max} 8`}
              className="bg-muted h-2 w-full rounded-full"
              role="img"
              aria-label={`${item.label}: ${item.value} percent`}
              preserveAspectRatio="none"
            >
              <rect
                width={item.value}
                height="8"
                rx="4"
                className="text-primary"
                fill="currentColor"
              />
            </svg>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

export function InstitutionQuickAction({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-card/70 hover:border-primary/30 hover:bg-card focus-visible:ring-ring group flex min-h-24 flex-col justify-between rounded-xl border p-4 outline-none transition-colors focus-visible:ring-2"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium">{label}</span>
        <ArrowUpRight
          className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
          aria-hidden="true"
        />
      </span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </Link>
  );
}

export function InstitutionActivityList({
  items,
}: {
  items: ReadonlyArray<{
    id: string;
    type: string;
    title: string;
    detail: string;
  }>;
}) {
  return (
    <ol className="divide-border divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className="bg-primary/15 mt-1.5 size-2.5 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <Badge variant="muted" className="mb-1">
              {item.type}
            </Badge>
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="text-muted-foreground text-xs">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
