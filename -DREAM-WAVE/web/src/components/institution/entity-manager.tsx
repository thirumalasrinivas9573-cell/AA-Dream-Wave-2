"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";
import {
  DataToolbar,
  InstitutionPageHeader,
  PaginationBar,
  SimpleModal,
  StatusBadge,
} from "@/components/institution/institution-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useInstitutionStore } from "@/store/institution-store";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type EntityManagerProps<T extends { id: string }> = {
  title: string;
  description: string;
  rows: T[];
  columns: Column<T>[];
  searchKeys: Array<(row: T) => string>;
  filterOptions?: Array<{ value: string; label: string }>;
  getFilterValue?: (row: T) => string;
  form: (args: {
    initial: T | null;
    onCancel: () => void;
    onSave: () => void;
  }) => ReactNode;
  onDelete: (id: string) => void;
  createLabel?: string;
};

const PAGE_SIZE = 6;

export function EntityManager<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  searchKeys,
  filterOptions,
  getFilterValue,
  form,
  onDelete,
  createLabel = "Add new",
}: EntityManagerProps<T>) {
  const hydrated = useInstitutionStore((state) => state.hydrated);
  const hydrate = useInstitutionStore((state) => state.hydrate);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  // Filter is cheap at institution page sizes; avoid unstable callback deps.
  const q = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const matchesSearch =
      !q || searchKeys.some((getter) => getter(row).toLowerCase().includes(q));
    const matchesFilter =
      filter === "all" || !getFilterValue || getFilterValue(row) === filter;
    return matchesSearch && matchesFilter;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading institution data" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title={title}
        description={description}
        actions={
          <Button
            type="button"
            className="h-10"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            {createLabel}
          </Button>
        }
      />

      <DataToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        {...(filterOptions
          ? {
              filter,
              filterOptions: [{ value: "all", label: "All statuses" }, ...filterOptions],
              onFilterChange: (value: string) => {
                setFilter(value);
                setPage(1);
              },
            }
          : {})}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} found`}
          description="Try adjusting search or filters, or create a new record."
          action={
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              {createLabel}
            </Button>
          }
        />
      ) : (
        <>
          <Card padding="none" className="overflow-hidden">
            <div className="table-scroll">
              <table
                className="w-full min-w-[36rem] text-left text-sm md:min-w-[640px]"
                aria-label={`${title} records`}
              >
                <thead className="bg-muted/40 border-border border-b">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 font-medium"
                        scope="col"
                      >
                        {column.header}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      className="border-border hover:bg-muted/20 border-b last:border-b-0"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 align-middle ${column.className || ""}`}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(row);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Delete"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <PaginationBar
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <SimpleModal
        title={editing ? `Edit ${title.slice(0, -1) || title}` : createLabel}
        open={open}
        onClose={() => setOpen(false)}
      >
        {form({
          initial: editing,
          onCancel: () => setOpen(false),
          onSave: () => setOpen(false),
        })}
      </SimpleModal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(openConfirm) => {
          if (!openConfirm) setDeleteId(null);
        }}
        title="Delete record"
        description="Delete this record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
        }}
      />
    </div>
  );
}

export function statusColumn<T extends { status: string }>(): Column<T> {
  return {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
  };
}
