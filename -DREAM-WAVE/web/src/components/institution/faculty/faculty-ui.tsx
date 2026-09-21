import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FacultyStatus } from "@/types/faculty-management";

export const FACULTY_STATUS_OPTIONS: Array<{
  value: FacultyStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on-leave", label: "On Leave" },
];

export function FacultyStatusBadge({ status }: { status: FacultyStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "outline"}
      className={status === "inactive" ? "border-destructive/40 text-destructive" : ""}
    >
      {FACULTY_STATUS_OPTIONS.find((option) => option.value === status)?.label}
    </Badge>
  );
}

export function FacultyField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function FacultyDetail({
  label,
  value,
}: {
  label: string;
  value?: string | number | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {value === undefined || value === "" ? "Not provided" : value}
      </dd>
    </div>
  );
}
