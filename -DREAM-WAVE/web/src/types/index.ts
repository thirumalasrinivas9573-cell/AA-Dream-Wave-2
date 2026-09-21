/**
 * Dream Wave — Centralized type system barrel.
 */

export type {
  AnimationDurationKey,
  AnimationEaseKey,
  MotionPreference,
} from "@/types/animation";
export type { ApiErrorBody, ApiResult, HttpMethod } from "@/types/api";
export type { AppEnvironment, ApplicationMeta } from "@/types/application";
export type {
  AuthFormStatus,
  AuthMeResponse,
  AuthMessageResponse,
  AuthSessionResponse,
  AuthUser,
  OtpPurpose,
} from "@/types/auth";
export type {
  PolymorphicProps,
  WithChildren,
  WithClassName,
} from "@/types/component";
export type {
  Bookmark,
  BookNote,
  Highlight,
  KnowledgeBook,
  KnowledgeChapter,
  LibraryScope,
  ReadingProgress,
} from "@/types/knowledge";
export type { ProviderProps } from "@/types/provider";
export type {
  Goal,
  GoalCategory,
  MentorMessage,
  MentorMode,
  Task,
  TaskPriority,
} from "@/types/student";
export type { ResolvedTheme, ThemeConfig, ThemeMode } from "@/types/theme";
export type {
  Dictionary,
  MaybePromise,
  Nullable,
  Optional,
} from "@/types/utility";
