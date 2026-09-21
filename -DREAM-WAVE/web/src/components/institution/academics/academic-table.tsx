"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AcademicColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
};

export function AcademicTable<T extends { id: string }>({
  rows,
  columns,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  minWidth = "min-w-[960px]",
  emptyTitle = "No records found",
  emptyDescription = "Adjust the search or filters, or create a new record.",
}: {
  rows: T[];
  columns: Array<AcademicColumn<T>>;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  minWidth?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} titleAs="h3" />;
  }

  const hasActions = Boolean(onEdit || onDelete);

  return (
    <Table className={minWidth}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={column.align === "right" ? "text-right" : undefined}
            >
              {column.sortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2"
                  aria-label={`Sort by ${column.header}`}
                >
                  {column.header}
                  {sortKey === column.key ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    )
                  ) : null}
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
          {hasActions ? <TableHead className="text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={column.align === "right" ? "text-right" : undefined}
              >
                {column.cell(row)}
              </TableCell>
            ))}
            {hasActions ? (
              <TableCell>
                <div className="flex justify-end gap-1">
                  {onEdit ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit record"
                      onClick={() => onEdit(row)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete record"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
