import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  AcademicStatus,
  ProgramLevel,
} from "@/types/academic-management";

export const ACADEMIC_STATUS_OPTIONS: Array<{
  value: AcademicStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
];

export const PROGRAM_LEVEL_OPTIONS: Array<{
  value: ProgramLevel;
  label: string;
}> = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificate" },
  { value: "integrated", label: "Integrated" },
  { value: "bootcamp", label: "Bootcamp" },
  { value: "training", label: "Training" },
];

export function AcademicStatusBadge({ status }: { status: AcademicStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "outline"}
      className={cn(
        status === "inactive" && "border-destructive/40 text-destructive",
        status === "draft" && "border-amber-500/40 text-amber-600 dark:text-amber-400",
      )}
    >
      {ACADEMIC_STATUS_OPTIONS.find((option) => option.value === status)?.label}
    </Badge>
  );
}

export function AcademicField({
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

export function exportCsv(
  fileName: string,
  header: string[],
  rows: Array<Array<string | number | boolean>>,
) {
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
