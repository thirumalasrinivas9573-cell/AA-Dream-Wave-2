export type AnnouncementCategory =
  | "academic"
  | "placement"
  | "examination"
  | "holiday"
  | "emergency"
  | "general";

export type AnnouncementPriority = "low" | "medium" | "high";

export type AnnouncementAudience =
  | "students"
  | "faculty"
  | "departments"
  | "institution";

export type AnnouncementStatus =
  | "published"
  | "scheduled"
  | "expired"
  | "draft";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  pinned: boolean;
  publishAt: string;
  expiryAt: string;
  status: AnnouncementStatus;
  attachments: string[];
  views: number;
};

export type EventCategory =
  | "workshop"
  | "seminar"
  | "conference"
  | "hackathon"
  | "sports"
  | "festival"
  | "club"
  | "guest-lecture";

export type EventMode = "online" | "offline" | "hybrid";

export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export type CampusEvent = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  bannerInitials: string;
  date: string;
  time: string;
  venue: string;
  mode: EventMode;
  capacity: number;
  registered: number;
  registrationDeadline: string;
  organizer: string;
  department: string;
  guestSpeakers: string[];
  agenda: string[];
  status: EventStatus;
};

export type ClubCategory =
  | "technical"
  | "coding"
  | "ai"
  | "robotics"
  | "cultural"
  | "music"
  | "dance"
  | "sports"
  | "photography"
  | "entrepreneurship";

export type StudentClub = {
  id: string;
  name: string;
  category: ClubCategory;
  logoInitials: string;
  coordinator: string;
  president: string;
  members: number;
  upcomingActivities: string[];
  status: "active" | "inactive";
};

export type GalleryCategory =
  | "event"
  | "convocation"
  | "sports"
  | "festivals"
  | "placements"
  | "workshops"
  | "achievements";

export type GalleryAlbum = {
  id: string;
  title: string;
  category: GalleryCategory;
  coverInitials: string;
  photos: number;
  videos: number;
  date: string;
  description: string;
};

export type NewsType =
  | "news"
  | "student-achievement"
  | "faculty-achievement"
  | "research"
  | "placement"
  | "award"
  | "ranking"
  | "competition";

export type CampusNews = {
  id: string;
  title: string;
  type: NewsType;
  summary: string;
  date: string;
  department: string;
};

export type CampusState = {
  announcements: Announcement[];
  events: CampusEvent[];
  clubs: StudentClub[];
  albums: GalleryAlbum[];
  news: CampusNews[];
};
