"use client";

import { Download, FilterX, Plus, Search, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ENTITY_PAGE_SIZE = 6;

export function EntityFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        className="form-control"
        value={value}
        aria-label={`Filter by ${label}`}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / ENTITY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = rows.slice(
    (safePage - 1) * ENTITY_PAGE_SIZE,
    safePage * ENTITY_PAGE_SIZE,
  );
  return { page: safePage, setPage, pageCount, visible };
}

export function EntityPagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-muted-foreground text-xs">
        Showing {total ? (page - 1) * ENTITY_PAGE_SIZE + 1 : 0}–
        {Math.min(page * ENTITY_PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="text-muted-foreground text-xs">
          Page {page} of {pageCount}
        </span>
        <Button type="button" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function EntityPanel({
  title,
  description,
  count,
  addLabel,
  onAdd,
  onImport,
  onExport,
  search,
  onSearch,
  searchPlaceholder,
  filters,
  onClearFilters,
  headerExtra,
  children,
}: {
  title: string;
  description: string;
  count: number;
  addLabel?: string;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  filters: ReactNode;
  onClearFilters: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card/80 min-w-0 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerExtra}
            {onImport ? (
              <Button type="button" variant="outline" onClick={onImport}>
                <Upload aria-hidden="true" />
                Import
              </Button>
            ) : null}
            {onExport ? (
              <Button type="button" variant="outline" onClick={onExport}>
                <Download aria-hidden="true" />
                Export
              </Button>
            ) : null}
            {onAdd && addLabel ? (
              <Button type="button" onClick={onAdd}>
                <Plus aria-hidden="true" />
                {addLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="h-11 pl-9"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <details className="border-border rounded-xl border" open>
          <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">
            Filters
          </summary>
          <div className="border-border grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
            {filters}
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button type="button" variant="ghost" onClick={onClearFilters}>
                <FilterX aria-hidden="true" />
                Clear filters
              </Button>
            </div>
          </div>
        </details>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {count} record{count === 1 ? "" : "s"} found
        </p>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}
