"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z_INDEX } from "@/constants";
import { useKeyboard } from "@/hooks/use-keyboard";

type InstitutionPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function InstitutionPageHeader({
  eyebrow = "Institution platform",
  title,
  description,
  actions,
}: InstitutionPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">{eyebrow}</p>
        <h1 className="page-title text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

type DataToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filter?: string;
  filterOptions?: Array<{ value: string; label: string }>;
  onFilterChange?: (value: string) => void;
  children?: ReactNode;
};

export function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filter,
  filterOptions,
  onFilterChange,
  children,
}: DataToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="h-10 w-full sm:max-w-xs"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
        />
        {filterOptions && onFilterChange ? (
          <select
            className="form-control sm:max-w-[200px]"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            aria-label="Filter"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums">
          Page {page} of {Math.max(pageCount, 1)}
        </span>
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

type SimpleModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function SimpleModal({
  title,
  open,
  onClose,
  children,
}: SimpleModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useKeyboard(
    (event) => {
      if (event.key === "Escape") onClose();
    },
    { enabled: open },
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex: Z_INDEX.modal }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="institution-modal-title"
    >
      <button
        type="button"
        className="bg-background/70 fade-in absolute inset-0 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="border-border bg-card fade-in-up relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-[var(--shadow-lg)] scroll-region">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="institution-modal-title"
            className="min-w-0 text-xl font-semibold tracking-tight text-balance"
          >
            {title}
          </h2>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {status}
    </span>
  );
}
