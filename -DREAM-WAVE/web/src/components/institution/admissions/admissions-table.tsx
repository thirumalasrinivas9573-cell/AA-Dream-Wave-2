"use client";

import { ArrowDown, ArrowUp, CalendarClock, Eye } from "lucide-react";
import { memo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { AdmissionStatusBadge } from "@/components/institution/admissions/admissions-ui";
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
  AdmissionApplication,
  AdmissionSortField,
} from "@/types/admissions";

type AdmissionsTableProps = {
  applications: AdmissionApplication[];
  sortField: AdmissionSortField;
  sortDirection: "asc" | "desc";
  onSort: (field: AdmissionSortField) => void;
  onView: (application: AdmissionApplication) => void;
  onScheduleInterview: (application: AdmissionApplication) => void;
};

function SortableHead({
  field,
  label,
  activeField,
  direction,
  onSort,
}: {
  field: AdmissionSortField;
  label: string;
  activeField: AdmissionSortField;
  direction: "asc" | "desc";
  onSort: (field: AdmissionSortField) => void;
}) {
  const active = activeField === field;
  return (
    <TableHead>
      <button
        type="button"
        className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2"
        onClick={() => onSort(field)}
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

export const AdmissionsTable = memo(function AdmissionsTable({
  applications,
  sortField,
  sortDirection,
  onSort,
  onView,
  onScheduleInterview,
}: AdmissionsTableProps) {
  if (!applications.length) {
    return (
      <EmptyState
        title="No applications found"
        description="Adjust the search or filters to view matching applications."
      />
    );
  }

  return (
    <Table className="min-w-[1480px]">
      <TableHeader>
        <TableRow>
          <SortableHead
            field="id"
            label="Application ID"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <TableHead>Photo</TableHead>
          <SortableHead
            field="fullName"
            label="Applicant Name"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <SortableHead
            field="department"
            label="Department"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortableHead
            field="course"
            label="Course"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <TableHead>Qualification</TableHead>
          <SortableHead
            field="applicationDate"
            label="Application Date"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortableHead
            field="status"
            label="Current Status"
            activeField={sortField}
            direction={sortDirection}
            onSort={onSort}
          />
          <TableHead>Assigned Officer</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id}>
            <TableCell>
              <button
                type="button"
                className="text-primary focus-visible:ring-ring rounded-sm font-medium outline-none hover:underline focus-visible:ring-2"
                onClick={() => onView(application)}
              >
                {application.id}
              </button>
            </TableCell>
            <TableCell>
              <span
                className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl text-xs font-semibold"
                aria-label={`Photo placeholder for ${application.fullName}`}
              >
                {application.photoInitials}
              </span>
            </TableCell>
            <TableCell className="font-medium">{application.fullName}</TableCell>
            <TableCell>
              <a
                href={`mailto:${application.email}`}
                className="focus-visible:ring-ring rounded-sm outline-none hover:underline focus-visible:ring-2"
              >
                {application.email}
              </a>
            </TableCell>
            <TableCell>{application.phone}</TableCell>
            <TableCell>{application.department}</TableCell>
            <TableCell>{application.course}</TableCell>
            <TableCell className="capitalize">{application.qualification}</TableCell>
            <TableCell>
              <time dateTime={application.applicationDate}>
                {new Date(`${application.applicationDate}T00:00:00`).toLocaleDateString()}
              </time>
            </TableCell>
            <TableCell>
              <AdmissionStatusBadge status={application.status} />
            </TableCell>
            <TableCell>{application.assignedOfficer}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`View ${application.fullName}'s application`}
                  onClick={() => onView(application)}
                >
                  <Eye aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Schedule interview for ${application.fullName}`}
                  onClick={() => onScheduleInterview(application)}
                >
                  <CalendarClock aria-hidden="true" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
