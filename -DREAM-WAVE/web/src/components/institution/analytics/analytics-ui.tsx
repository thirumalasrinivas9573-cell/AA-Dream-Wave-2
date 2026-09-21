import { type LucideIcon,Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { ProgressBar } from "@/components/dashboard/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function TrendIndicator({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function ProgressRing({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative size-32">
        <svg
          viewBox="0 0 36 36"
          className="size-full -rotate-90"
          role="img"
          aria-label={`${label}: ${pct}%`}
        >
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-muted"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {caption ? <p className="text-muted-foreground text-xs">{caption}</p> : null}
      </div>
    </div>
  );
}

export function ScoreCard({
  title,
  score,
  max = 100,
  description,
  trend,
}: {
  title: string;
  score: number;
  max?: number;
  description: string;
  trend?: number;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-1 text-3xl tabular-nums">
              {score}
              <span className="text-muted-foreground text-base">/{max}</span>
            </CardTitle>
          </div>
          {trend !== undefined ? <TrendIndicator value={trend} /> : null}
        </div>
        <ProgressBar value={pct} className="mt-3" />
        <p className="text-muted-foreground mt-2 text-xs">{description}</p>
      </CardHeader>
    </Card>
  );
}

export function AiInsightCard({
  title,
  description,
  icon: Icon = Sparkles,
  badge = "AI",
  points,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
  points: string[];
}) {
  return (
    <Card className="from-primary/5 border-primary/20 to-card/60 bg-gradient-to-br backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <Badge variant="outline" className="border-primary/40 text-primary">
            {badge}
          </Badge>
        </div>
        <CardTitle className="mt-2 text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm">
              <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-xs">
          Insight surface is architecture-ready for the AI intelligence service.
        </p>
      </CardContent>
    </Card>
  );
}

export function HeatMap({
  title,
  description,
  rows,
  columns,
  values,
}: {
  title: string;
  description: string;
  rows: string[];
  columns: string[];
  values: number[][];
}) {
  const max = Math.max(1, ...values.flat());
  return (
    <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="text-muted-foreground p-1 text-left font-medium">Area</th>
              {columns.map((column) => (
                <th key={column} className="text-muted-foreground p-1 text-center font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row}>
                <td className="p-1 font-medium">{row}</td>
                {columns.map((column, colIndex) => {
                  const value = values[rowIndex]?.[colIndex] ?? 0;
                  const intensity = Math.round((value / max) * 100);
                  return (
                    <td key={column} className="p-1">
                      <div
                        className="bg-primary flex h-8 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                        style={{ opacity: 0.2 + (intensity / 100) * 0.8 }}
                        title={`${row} · ${column}: ${value}`}
                      >
                        {value}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-foreground mt-3 text-xs">
          Heat-map surface is architecture-ready for granular time-series intensity data.
        </p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsSection({
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
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

export function ExportBar({
  onExportCsv,
  onPrint,
}: {
  onExportCsv: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
        Export CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
        Export Excel
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPrint}>
        Export PDF
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPrint}>
        Print
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPrint}>
        Share
      </Button>
    </div>
  );
}
