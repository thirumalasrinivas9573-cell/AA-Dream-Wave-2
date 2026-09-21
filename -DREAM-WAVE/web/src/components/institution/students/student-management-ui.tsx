import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  ManagedStudentStatus,
  PlacementStatus,
} from "@/types/student-management";

export const STUDENT_STATUS_OPTIONS: Array<{
  value: ManagedStudentStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "suspended", label: "Suspended" },
];

export const PLACEMENT_STATUS_OPTIONS: Array<{
  value: PlacementStatus;
  label: string;
}> = [
  { value: "not-started", label: "Not Started" },
  { value: "preparing", label: "Preparing" },
  { value: "placement-ready", label: "Placement Ready" },
  { value: "interviewing", label: "Interviewing" },
  { value: "placed", label: "Placed" },
];

export function StudentStatusBadge({ status }: { status: ManagedStudentStatus }) {
  return (
    <Badge
      variant={
        status === "active"
          ? "default"
          : status === "graduated"
            ? "secondary"
            : "outline"
      }
      className={
        status === "suspended" ? "border-destructive/40 text-destructive" : ""
      }
    >
      {STUDENT_STATUS_OPTIONS.find((option) => option.value === status)?.label}
    </Badge>
  );
}

export function StudentField({
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

export function StudentDetail({
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
