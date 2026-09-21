import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AdmissionStatus } from "@/types/admissions";

export const ADMISSION_STATUS_OPTIONS: Array<{
  value: AdmissionStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "document-verification", label: "Document Verification" },
  { value: "interview-scheduled", label: "Interview Scheduled" },
  { value: "under-review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "waiting-list", label: "Waiting List" },
  { value: "enrolled", label: "Enrolled" },
];

export function getAdmissionStatusLabel(status: AdmissionStatus) {
  return (
    ADMISSION_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  const variant =
    status === "approved" || status === "enrolled"
      ? "default"
      : status === "rejected"
        ? "outline"
        : status === "waiting-list"
          ? "secondary"
          : "outline";

  return (
    <Badge
      variant={variant}
      className={status === "rejected" ? "border-destructive/40 text-destructive" : ""}
    >
      {getAdmissionStatusLabel(status)}
    </Badge>
  );
}

export function AdmissionField({
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

export function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd>
    </div>
  );
}
