export type InstitutionType =
  | "university"
  | "engineering"
  | "medical"
  | "business"
  | "arts-science"
  | "law";

export type ReviewAudience = "student" | "alumni" | "company";

export type DiscoveryLocation = {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type DiscoverySocial = {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

export type DiscoveryRanking = {
  label: string;
  rank: string;
};

export type DiscoveryProgram = {
  id: string;
  name: string;
  level: "UG" | "PG" | "Diploma" | "PhD";
  department: string;
  duration: string;
  eligibility: string;
  specializations: string[];
};

export type DiscoveryFaculty = {
  id: string;
  name: string;
  initials: string;
  title: string;
  department: string;
  qualification: string;
  experience: string;
  research: string;
  awards: string[];
};

export type DiscoveryGalleryItem = {
  id: string;
  title: string;
  category: "campus" | "labs" | "library" | "sports" | "hostel" | "events";
};

export type DiscoveryAchievement = {
  id: string;
  title: string;
  category: "award" | "research" | "patent" | "ranking" | "competition" | "sports";
  year: string;
  detail: string;
};

export type DiscoveryReview = {
  id: string;
  author: string;
  initials: string;
  audience: ReviewAudience;
  rating: number;
  title: string;
  text: string;
  date: string;
};

export type DiscoverySuccessStory = {
  id: string;
  name: string;
  initials: string;
  company: string;
  packageLpa: number;
  quote: string;
};

export type DiscoveryFee = {
  label: string;
  amount: string;
};

export type DiscoveryImportantDate = {
  label: string;
  date: string;
};

export type DiscoveryInfrastructure = {
  name: string;
  detail: string;
};

export type InstitutionProfile = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  type: InstitutionType;
  verified: boolean;
  rating: number;
  reviewCount: number;
  logoInitials: string;
  established: number;
  affiliation: string;
  accreditation: string[];
  approvals: string[];
  rankings: DiscoveryRanking[];
  campusAreaAcres: number;
  location: DiscoveryLocation;
  website: string;
  email: string;
  phone: string;
  social: DiscoverySocial;
  overview: string;
  mission: string;
  vision: string;
  history: string;
  leader: {
    name: string;
    title: string;
    initials: string;
    message: string;
  };
  stats: {
    students: number;
    faculty: number;
    departments: number;
    programs: number;
    placementRate: number;
    highestPackageLpa: number;
    avgPackageLpa: number;
    internships: number;
  };
  annualFeesLpa: number;
  departments: string[];
  programs: DiscoveryProgram[];
  recruiters: string[];
  placementPartners: string[];
  successStories: DiscoverySuccessStory[];
  featuredFaculty: DiscoveryFaculty[];
  gallery: DiscoveryGalleryItem[];
  infrastructure: DiscoveryInfrastructure[];
  achievements: DiscoveryAchievement[];
  reviews: DiscoveryReview[];
  ratingsBreakdown: {
    teaching: number;
    placement: number;
    campus: number;
    faculty: number;
    value: number;
  };
  facilities: {
    hostel: boolean;
    sports: boolean;
    library: boolean;
    labs: boolean;
    innovationLab: boolean;
    wifi: boolean;
  };
  admission: {
    process: string[];
    eligibility: string[];
    documents: string[];
    fees: DiscoveryFee[];
    scholarships: string[];
    importantDates: DiscoveryImportantDate[];
    applyUrl: string;
  };
};
