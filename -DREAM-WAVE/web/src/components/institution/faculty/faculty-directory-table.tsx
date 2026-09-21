"use client";

import { ArrowDown, ArrowUp, Eye, MoreHorizontal } from "lucide-react";
import { memo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { FacultyStatusBadge } from "@/components/institution/faculty/faculty-ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FacultySortField,
  ManagedFaculty,
} from "@/types/faculty-management";

function SortHead({
  field,
  label,
  current,
  direction,
  onSort,
}: {
  field: FacultySortField;
  label: string;
  current: FacultySortField;
  direction: "asc" | "desc";
  onSort: (field: FacultySortField) => void;
}) {
  const active = field === current;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3" aria-hidden="true" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

export const FacultyDirectoryTable = memo(function FacultyDirectoryTable({
  faculty,
  sortField,
  sortDirection,
  onSort,
  onView,
}: {
  faculty: ManagedFaculty[];
  sortField: FacultySortField;
  sortDirection: "asc" | "desc";
  onSort: (field: FacultySortField) => void;
  onView: (faculty: ManagedFaculty) => void;
}) {
  if (!faculty.length) {
    return (
      <EmptyState
        title="No faculty found"
        description="Adjust the directory search or advanced filters."
      />
    );
  }

  return (
    <Table className="min-w-[1420px]">
      <TableHeader>
        <TableRow>
          <TableHead>Photo</TableHead>
          <SortHead field="id" label="Employee ID" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="fullName" label="Faculty Name" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="designation" label="Designation" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="department" label="Department" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="highestQualification" label="Qualification" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="totalExperience" label="Experience" current={sortField} direction={sortDirection} onSort={onSort} />
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Employment Type</TableHead>
          <SortHead field="joiningDate" label="Joining Date" current={sortField} direction={sortDirection} onSort={onSort} />
          <SortHead field="status" label="Status" current={sortField} direction={sortDirection} onSort={onSort} />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {faculty.map((record) => (
          <TableRow key={record.id}>
            <TableCell>
              <span
                className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl text-xs font-semibold"
                aria-label={`Photo placeholder for ${record.fullName}`}
              >
                {record.photoInitials}
              </span>
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => onView(record)}
                className="text-primary focus-visible:ring-ring rounded-sm font-medium outline-none hover:underline focus-visible:ring-2"
              >
                {record.id}
              </button>
            </TableCell>
            <TableCell className="font-medium">{record.fullName}</TableCell>
            <TableCell>{record.designation}</TableCell>
            <TableCell>{record.department}</TableCell>
            <TableCell>{record.highestQualification}</TableCell>
            <TableCell>{record.totalExperience} years</TableCell>
            <TableCell>
              <a href={`mailto:${record.email}`} className="focus-visible:ring-ring rounded-sm outline-none hover:underline focus-visible:ring-2">
                {record.email}
              </a>
            </TableCell>
            <TableCell>{record.phone}</TableCell>
            <TableCell className="capitalize">{record.employmentType.replace("-", " ")}</TableCell>
            <TableCell>{new Date(`${record.joiningDate}T00:00:00`).toLocaleDateString()}</TableCell>
            <TableCell><FacultyStatusBadge status={record.status} /></TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button type="button" size="icon-sm" variant="ghost" aria-label={`View ${record.fullName}`} onClick={() => onView(record)}>
                  <Eye aria-hidden="true" />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label={`More actions for ${record.fullName}`} onClick={() => onView(record)}>
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
