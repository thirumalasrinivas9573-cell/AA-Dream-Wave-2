import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  EventCategory,
  EventStatus,
  NewsType,
} from "@/types/campus-management";

export const ANNOUNCEMENT_CATEGORY_OPTIONS: Array<{
  value: AnnouncementCategory;
  label: string;
}> = [
  { value: "academic", label: "Academic" },
  { value: "placement", label: "Placement" },
  { value: "examination", label: "Examination" },
  { value: "holiday", label: "Holiday" },
  { value: "emergency", label: "Emergency" },
  { value: "general", label: "General" },
];

export const ANNOUNCEMENT_STATUS_OPTIONS: Array<{
  value: AnnouncementStatus;
  label: string;
}> = [
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "draft", label: "Draft" },
];

export const EVENT_CATEGORY_OPTIONS: Array<{
  value: EventCategory;
  label: string;
}> = [
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "conference", label: "Conference" },
  { value: "hackathon", label: "Hackathon" },
  { value: "sports", label: "Sports" },
  { value: "festival", label: "Festival" },
  { value: "club", label: "Club Activity" },
  { value: "guest-lecture", label: "Guest Lecture" },
];

export const EVENT_STATUS_OPTIONS: Array<{
  value: EventStatus;
  label: string;
}> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const NEWS_TYPE_OPTIONS: Array<{ value: NewsType; label: string }> = [
  { value: "news", label: "Institution News" },
  { value: "student-achievement", label: "Student Achievement" },
  { value: "faculty-achievement", label: "Faculty Achievement" },
  { value: "research", label: "Research Highlight" },
  { value: "placement", label: "Placement Highlight" },
  { value: "award", label: "Award" },
  { value: "ranking", label: "Ranking" },
  { value: "competition", label: "Competition" },
];

const PRIORITY_CLASS: Record<AnnouncementPriority, string> = {
  high: "border-destructive/40 text-destructive",
  medium: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  low: "border-muted-foreground/40 text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  return (
    <Badge variant="outline" className={cn("capitalize", PRIORITY_CLASS[priority])}>
      {priority}
    </Badge>
  );
}

const ANNOUNCEMENT_STATUS_CLASS: Record<AnnouncementStatus, string> = {
  published: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  scheduled: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  expired: "border-muted-foreground/40 text-muted-foreground",
  draft: "border-amber-500/40 text-amber-600 dark:text-amber-400",
};

export function AnnouncementStatusBadge({
  status,
}: {
  status: AnnouncementStatus;
}) {
  return (
    <Badge variant="outline" className={cn("capitalize", ANNOUNCEMENT_STATUS_CLASS[status])}>
      {status}
    </Badge>
  );
}

const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  upcoming: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  ongoing: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  completed: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  cancelled: "border-destructive/40 text-destructive",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", EVENT_STATUS_CLASS[status])}>
      {status}
    </Badge>
  );
}

export function categoryLabel(category: EventCategory) {
  return (
    EVENT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

export function newsTypeLabel(type: NewsType) {
  return NEWS_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function formatDate(value: string) {
  if (!value) return "TBD";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
