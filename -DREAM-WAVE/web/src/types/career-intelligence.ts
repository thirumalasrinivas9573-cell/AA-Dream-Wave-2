export type CareerJobType = "full-time" | "internship";

export type CareerJobStatus = "recommended" | "saved" | "applied";

export type CareerJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: CareerJobType;
  matchScore: number;
  eligibility: "eligible" | "stretch" | "not-ready";
  skills: string[];
  status: CareerJobStatus;
  salary?: string;
};

export type InterviewMode = "technical" | "hr" | "coding";

export type InterviewSession = {
  id: string;
  mode: InterviewMode;
  question: string;
  answer: string;
  feedback: string;
  score: number;
  createdAt: string;
};

export type ResumeVersion = {
  id: string;
  label: string;
  score: number;
  summary: string;
  suggestions: string[];
  preview: string;
  createdAt: string;
};

export type CareerGoal = {
  id: string;
  label: string;
  done: boolean;
  due?: string;
};

export type CareerMilestone = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  done: boolean;
};

export type CareerIntelligenceState = {
  readinessScore: number;
  interviewReadiness: number;
  placementReadiness: number;
  goals: CareerGoal[];
  milestones: CareerMilestone[];
  jobs: CareerJob[];
  interviews: InterviewSession[];
  resumeVersions: ResumeVersion[];
  growthSeries: number[];
};
