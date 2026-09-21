import { aiApi } from "@/lib/api/ai";
import { authApi } from "@/lib/api/auth";
import { booksApi } from "@/lib/api/books";
import { communityApi } from "@/lib/api/community";
import { dailyApi } from "@/lib/api/daily";
import { goalsApi } from "@/lib/api/goals";
import { lessonApi } from "@/lib/api/lesson";
import { mentorApi } from "@/lib/api/mentor";
import { profileApi } from "@/lib/api/profile";
import { reportApi } from "@/lib/api/report";
import { roadmapApi } from "@/lib/api/roadmap";
import { tasksApi } from "@/lib/api/tasks";

export { authApi };
export { aiApi } from "@/lib/api/ai";
export * from "@/lib/api/auth";
export { booksApi } from "@/lib/api/books";
export { apiRequest } from "@/lib/api/client";
export { communityApi } from "@/lib/api/community";
export { dailyApi } from "@/lib/api/daily";
export { goalsApi } from "@/lib/api/goals";
export { lessonApi } from "@/lib/api/lesson";
export { mentorApi } from "@/lib/api/mentor";
export { profileApi } from "@/lib/api/profile";
export { reportApi } from "@/lib/api/report";
export { roadmapApi } from "@/lib/api/roadmap";
export { tasksApi } from "@/lib/api/tasks";
export { recruitmentApi } from "@/lib/api/recruitment";
export {
  partnershipsApi,
  discoveryApi,
  platformNotificationsApi,
} from "@/lib/api/partnerships";

export const API_READY = true as const;

export const studentApis = {
  goals: goalsApi,
  tasks: tasksApi,
  mentor: mentorApi,
  roadmap: roadmapApi,
  books: booksApi,
  reports: reportApi,
  ai: aiApi,
  lessons: lessonApi,
  auth: authApi,
  community: communityApi,
  profile: profileApi,
  daily: dailyApi,
};
