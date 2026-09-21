export type CommunityKind =
  | "public"
  | "institution"
  | "company"
  | "course"
  | "subject"
  | "project";

export type Community = {
  id: string;
  name: string;
  kind: CommunityKind;
  description: string;
  members: number;
  topics: string[];
  trending?: boolean;
  joined?: boolean;
};

export type DiscussionReaction = {
  type: "like" | "insight" | "helpful";
  count: number;
};

export type DiscussionComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  replies: Array<{ id: string; author: string; body: string; createdAt: string }>;
};

export type DiscussionPost = {
  id: string;
  communityId: string;
  author: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  reactions: DiscussionReaction[];
  comments: DiscussionComment[];
  saved?: boolean;
  aiSuggestions: string[];
  postType?: string;
  visibility?: string;
  linkedEntity?: { entityType: string; entityId: string; snapshot?: Record<string, unknown> } | null;
  relevanceReason?: string | null;
  likedByMe?: boolean;
};

export type CommunityMentor = {
  id: string;
  name: string;
  title: string;
  rating: number;
  sessions: number;
  specialties: string[];
  available: boolean;
};

export type StudyGroup = {
  id: string;
  name: string;
  subject: string;
  members: string[];
  progress: number;
  nextSession: string;
  resources: string[];
};

export type CollabTeam = {
  id: string;
  name: string;
  focus: string;
  members: string[];
  sharedNotes: string[];
  sharedResources: string[];
  sharedTasks: Array<{ id: string; title: string; done: boolean }>;
  roadmap: string;
};

export type CollabProject = {
  id: string;
  title: string;
  progress: number;
  milestones: Array<{ id: string; label: string; done: boolean }>;
  documents: string[];
  timeline: Array<{ id: string; label: string; at: string }>;
  teamId: string;
};

export type CommunityMessage = {
  id: string;
  conversationId: string;
  from: string;
  body: string;
  at: string;
  kind: "text" | "file" | "media";
  fileName?: string;
};

export type CommunityConversation = {
  id: string;
  title: string;
  participants: string[];
  unread: number;
  lastMessage: string;
  updatedAt: string;
};

export type CommunityActivity = {
  id: string;
  label: string;
  at: string;
  kind: "post" | "join" | "session" | "project" | "message";
};

export type CommunityUserState = {
  communities: Community[];
  posts: DiscussionPost[];
  mentors: CommunityMentor[];
  groups: StudyGroup[];
  teams: CollabTeam[];
  projects: CollabProject[];
  conversations: CommunityConversation[];
  messages: CommunityMessage[];
  activity: CommunityActivity[];
  bookedMentorIds: string[];
};
