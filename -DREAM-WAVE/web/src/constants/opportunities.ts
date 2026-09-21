import { ROUTES } from "@/constants/routes";

export const OPPORTUNITY_ROUTES = {
  feed: "/opportunities",
} as const;

export const OPPORTUNITY_SECTIONS = [
  { id: "for-you", label: "For You" },
  { id: "closing-soon", label: "Closing Soon" },
  { id: "skill-building", label: "Skill Building" },
  { id: "explore", label: "Explore" },
] as const;

export const AI_OPPORTUNITY_PROMPTS = [
  "Find opportunities for me",
  "Which hackathons match my skills?",
  "What should I prepare?",
  "Which deadlines are closest?",
  "Why is this recommended?",
] as const;

export { ROUTES };
