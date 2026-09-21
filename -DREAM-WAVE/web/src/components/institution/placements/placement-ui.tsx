import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ApplicationStage,
  InterviewStatus,
  ListingStatus,
  OfferStatus,
  PlacementStatus,
} from "@/types/placement-management";

export const PLACEMENT_STATUS_OPTIONS: Array<{
  value: PlacementStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

export const LISTING_STATUS_OPTIONS: Array<{
  value: ListingStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "draft", label: "Draft" },
];

export const APPLICATION_STAGE_OPTIONS: Array<{
  value: ApplicationStage;
  label: string;
}> = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "assessment", label: "Assessment" },
  { value: "interview", label: "Interview" },
  { value: "hr-round", label: "HR Round" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "offer-accepted", label: "Offer Accepted" },
  { value: "offer-declined", label: "Offer Declined" },
];

const PLACEMENT_STATUS_CLASS: Record<PlacementStatus, string> = {
  draft: "border-muted-foreground/40 text-muted-foreground",
  published: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  registration_open: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  registration_closed: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  upcoming: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  ongoing: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  completed: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  closed: "border-muted-foreground/40 text-muted-foreground",
  cancelled: "border-destructive/40 text-destructive",
  archived: "border-muted-foreground/40 text-muted-foreground",
};

export function PlacementStatusBadge({ status }: { status: PlacementStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", PLACEMENT_STATUS_CLASS[status])}>
      {status}
    </Badge>
  );
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <Badge
      variant={status === "open" ? "default" : "outline"}
      className={cn(
        "capitalize",
        status === "closed" && "border-destructive/40 text-destructive",
        status === "draft" && "border-amber-500/40 text-amber-600 dark:text-amber-400",
      )}
    >
      {status}
    </Badge>
  );
}

const STAGE_CLASS: Partial<Record<ApplicationStage, string>> = {
  selected: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  "offer-accepted": "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  rejected: "border-destructive/40 text-destructive",
  "offer-declined": "border-destructive/40 text-destructive",
};

export function ApplicationStageBadge({ stage }: { stage: ApplicationStage }) {
  const label =
    APPLICATION_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
  return (
    <Badge variant="outline" className={cn(STAGE_CLASS[stage])}>
      {label}
    </Badge>
  );
}

const INTERVIEW_CLASS: Record<InterviewStatus, string> = {
  scheduled: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  completed: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  cancelled: "border-destructive/40 text-destructive",
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", INTERVIEW_CLASS[status])}>
      {status}
    </Badge>
  );
}

const OFFER_CLASS: Record<OfferStatus, string> = {
  released: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  accepted: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  declined: "border-destructive/40 text-destructive",
  expired: "border-muted-foreground/40 text-muted-foreground",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", OFFER_CLASS[status])}>
      {status}
    </Badge>
  );
}

export function formatCurrency(value: number) {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)} LPA`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatStipend(value: number) {
  return `₹${value.toLocaleString("en-IN")}/mo`;
}
