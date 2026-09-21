export type ResearchStatus = "active" | "paused" | "archived";

export type ResearchNote = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  category: string;
  collectionId: string | null;
  updatedAt: string;
  createdAt: string;
};

export type ResearchCollection = {
  id: string;
  name: string;
  description: string;
  color: string;
};

export type ResearchHighlight = {
  id: string;
  text: string;
  note?: string;
  createdAt: string;
};

export type ResearchBookmark = {
  id: string;
  label: string;
  page: number;
  createdAt: string;
};

export type ResearchDocument = {
  id: string;
  title: string;
  source: string;
  pdfUrl?: string;
  content: string;
  highlights: ResearchHighlight[];
  bookmarks: ResearchBookmark[];
};

export type ResearchTimelineEvent = {
  id: string;
  label: string;
  at: string;
  kind: "created" | "edited" | "note" | "tool" | "milestone";
};

export type ResearchProject = {
  id: string;
  title: string;
  topic: string;
  status: ResearchStatus;
  summary: string;
  content: string;
  tags: string[];
  category: string;
  collectionId: string | null;
  progress: number;
  documentId: string | null;
  timeline: ResearchTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ResearchWorkspacePrefs = {
  leftWidth: number;
  rightWidth: number;
  showLeft: boolean;
  showRight: boolean;
  fullscreen: boolean;
  splitReading: boolean;
};

export type ResearchUserState = {
  projects: ResearchProject[];
  notes: ResearchNote[];
  collections: ResearchCollection[];
  documents: ResearchDocument[];
  prefs: ResearchWorkspacePrefs;
};
