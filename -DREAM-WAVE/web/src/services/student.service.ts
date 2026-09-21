import { aiApi } from "@/lib/api/ai";
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

export const studentService = {
  goals: goalsApi,
  tasks: tasksApi,
  mentor: mentorApi,
  roadmap: roadmapApi,
  books: booksApi,
  reports: reportApi,
  ai: aiApi,
  lessons: lessonApi,
  community: communityApi,
  profile: profileApi,
  daily: dailyApi,
};
