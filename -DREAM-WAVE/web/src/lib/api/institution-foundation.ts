import { apiRequest } from "@/lib/api/client";

export type InstitutionFoundationProfile = {
  id: string;
  ownerUserId?: string;
  name: string;
  type: string;
  code: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  country: string;
  description: string;
  departments: string[];
  programs: string[];
  verified: boolean;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InstitutionFoundationDashboard = {
  generatedAt: string;
  students: {
    total: number;
    active: number;
    placed: number;
    placementRate: number;
    byDepartment: Record<string, number>;
  };
  organization: {
    departments: number;
    programs: number;
  };
  admissions: {
    totalApplications: number;
    pendingReview: number;
    incompleteProfiles?: number;
    completeProfiles?: number;
    source?: string;
  };
  faculty?: {
    total: number;
  };
  placements: {
    companies: number;
    drives: number;
    internships: number;
    jobs: number;
    applications: number;
    interviews: number;
    offers: number;
    placed: number;
    activePartnerships: number;
  };
  research: { activeProjects: number };
  incubation: { activeStartups: number };
  alumni: { total: number };
  events: { upcoming: number };
  hasData: boolean;
};

export const institutionFoundationApi = {
  getProfile: (token: string) =>
    apiRequest<{ success: boolean; profile: InstitutionFoundationProfile }>(
      "/institution/foundation/profile",
      { token },
    ),

  updateProfile: (token: string, body: Partial<InstitutionFoundationProfile>) =>
    apiRequest<{ success: boolean; profile: InstitutionFoundationProfile }>(
      "/institution/foundation/profile",
      { token, method: "PATCH", body },
    ),

  getDashboard: (token: string) =>
    apiRequest<{ success: boolean; dashboard: InstitutionFoundationDashboard }>(
      "/institution/foundation/dashboard",
      { token },
    ),
};
