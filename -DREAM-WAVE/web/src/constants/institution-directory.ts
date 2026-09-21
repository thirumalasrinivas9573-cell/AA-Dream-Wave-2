import type {
  DiscoveryAchievement,
  DiscoveryFaculty,
  DiscoveryGalleryItem,
  DiscoveryProgram,
  DiscoveryReview,
  DiscoverySuccessStory,
  InstitutionProfile,
  InstitutionType,
} from "@/types/institution-discovery";

type InstitutionSpec = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  type: InstitutionType;
  logoInitials: string;
  established: number;
  affiliation: string;
  city: string;
  state: string;
  campusAreaAcres: number;
  rating: number;
  reviewCount: number;
  annualFeesLpa: number;
  rankings: InstitutionProfile["rankings"];
  accreditation: string[];
  approvals: string[];
  departments: string[];
  recruiters: string[];
  stats: InstitutionProfile["stats"];
  overview: string;
  mission: string;
  vision: string;
  history: string;
  leaderName: string;
  leaderTitle: string;
  verified?: boolean;
};

const PROGRAM_LEVELS: DiscoveryProgram["level"][] = ["UG", "PG", "PhD"];

function makePrograms(departments: string[]): DiscoveryProgram[] {
  return departments.flatMap((department, index) => {
    const level = PROGRAM_LEVELS[index % PROGRAM_LEVELS.length] ?? "UG";
    return [
      {
        id: `prog-${index}-a`,
        name: `${level === "UG" ? "B.Tech" : level === "PG" ? "M.Tech" : "Ph.D"} ${department}`,
        level,
        department,
        duration: level === "UG" ? "4 years" : level === "PG" ? "2 years" : "3-5 years",
        eligibility:
          level === "UG"
            ? "10+2 with 60% and valid entrance rank"
            : level === "PG"
              ? "Relevant Bachelor's with 55% and entrance score"
              : "Master's degree with research aptitude",
        specializations: [
          `Applied ${department}`,
          `${department} Systems`,
          `Advanced ${department}`,
        ],
      },
    ];
  });
}

function makeFaculty(shortName: string, departments: string[]): DiscoveryFaculty[] {
  const names = [
    { name: "Dr. Ananya Rao", initials: "AR", title: "Professor & Head" },
    { name: "Dr. Vikram Nair", initials: "VN", title: "Professor" },
    { name: "Dr. Meera Iyer", initials: "MI", title: "Associate Professor" },
    { name: "Dr. Rohan Gupta", initials: "RG", title: "Assistant Professor" },
  ];
  return names.map((person, index) => ({
    id: `${shortName}-fac-${index}`,
    name: person.name,
    initials: person.initials,
    title: person.title,
    department: departments[index % departments.length] ?? departments[0] ?? "General",
    qualification: index % 2 === 0 ? "Ph.D, IIT" : "Ph.D, IISc",
    experience: `${8 + index * 4} years`,
    research: `${12 + index * 6} publications · ${2 + index} patents`,
    awards: index % 2 === 0 ? ["Best Researcher Award", "Young Scientist"] : ["Excellence in Teaching"],
  }));
}

function makeGallery(): DiscoveryGalleryItem[] {
  const categories: DiscoveryGalleryItem["category"][] = [
    "campus",
    "labs",
    "library",
    "sports",
    "hostel",
    "events",
  ];
  const titles: Record<DiscoveryGalleryItem["category"], string> = {
    campus: "Central Campus Green",
    labs: "Advanced Research Lab",
    library: "Central Library",
    sports: "Sports Complex",
    hostel: "Residential Hostels",
    events: "Annual Tech Fest",
  };
  return categories.map((category, index) => ({
    id: `gallery-${index}`,
    title: titles[category],
    category,
  }));
}

function makeAchievements(shortName: string): DiscoveryAchievement[] {
  return [
    { id: `${shortName}-ach-1`, title: "NIRF Top 50 Ranking", category: "ranking", year: "2026", detail: "Ranked among the top engineering institutions nationally." },
    { id: `${shortName}-ach-2`, title: "Smart India Hackathon Winners", category: "competition", year: "2025", detail: "Grand finale winners across two problem statements." },
    { id: `${shortName}-ach-3`, title: "AI Research Patent Granted", category: "patent", year: "2025", detail: "Patent granted for adaptive learning systems." },
    { id: `${shortName}-ach-4`, title: "Best Innovation Award", category: "award", year: "2024", detail: "Recognised by the state innovation council." },
    { id: `${shortName}-ach-5`, title: "Inter-University Sports Champions", category: "sports", year: "2024", detail: "Overall champions at the zonal sports meet." },
    { id: `${shortName}-ach-6`, title: "₹4.2 Cr Research Grant", category: "research", year: "2024", detail: "Awarded for sustainable energy research." },
  ];
}

function makeReviews(shortName: string): DiscoveryReview[] {
  return [
    { id: `${shortName}-rev-1`, author: "Priya S.", initials: "PS", audience: "student", rating: 5, title: "Excellent academics", text: "Faculty are supportive and the labs are world-class. Placement support starts early.", date: "2026-05-12" },
    { id: `${shortName}-rev-2`, author: "Karthik M.", initials: "KM", audience: "alumni", rating: 4, title: "Strong alumni network", text: "The alumni network opened doors globally. Campus life is vibrant and balanced.", date: "2026-03-08" },
    { id: `${shortName}-rev-3`, author: "TechCorp HR", initials: "TC", audience: "company", rating: 5, title: "Great talent pipeline", text: "We hire here every year — students are industry-ready and disciplined.", date: "2026-02-20" },
    { id: `${shortName}-rev-4`, author: "Neha R.", initials: "NR", audience: "student", rating: 4, title: "Vibrant campus", text: "Clubs, fests and sports keep the campus alive. Hostels are comfortable.", date: "2026-01-15" },
  ];
}

function makeSuccessStories(recruiters: string[]): DiscoverySuccessStory[] {
  const alumni = [
    { name: "Aditya Menon", initials: "AM", packageLpa: 44 },
    { name: "Sneha Kapoor", initials: "SK", packageLpa: 38 },
    { name: "Rahul Verma", initials: "RV", packageLpa: 32 },
  ];
  return alumni.map((person, index) => ({
    id: `story-${index}`,
    name: person.name,
    initials: person.initials,
    company: recruiters[index % recruiters.length] ?? "Top Recruiter",
    packageLpa: person.packageLpa,
    quote: "The mentorship and placement cell prepared me for global roles.",
  }));
}

function createInstitution(spec: InstitutionSpec): InstitutionProfile {
  const verified = spec.verified ?? true;
  return {
    id: spec.slug,
    slug: spec.slug,
    name: spec.name,
    shortName: spec.shortName,
    tagline: spec.tagline,
    type: spec.type,
    verified,
    rating: spec.rating,
    reviewCount: spec.reviewCount,
    logoInitials: spec.logoInitials,
    established: spec.established,
    affiliation: spec.affiliation,
    accreditation: spec.accreditation,
    approvals: spec.approvals,
    rankings: spec.rankings,
    campusAreaAcres: spec.campusAreaAcres,
    location: {
      address: `${spec.shortName} Campus, Knowledge City`,
      city: spec.city,
      state: spec.state,
      country: "India",
      pincode: "500001",
    },
    website: `https://www.${spec.slug}.edu.in`,
    email: `admissions@${spec.slug}.edu.in`,
    phone: "+91 40 4000 1000",
    social: {
      linkedin: `https://linkedin.com/school/${spec.slug}`,
      twitter: `https://twitter.com/${spec.slug}`,
      instagram: `https://instagram.com/${spec.slug}`,
      youtube: `https://youtube.com/@${spec.slug}`,
    },
    overview: spec.overview,
    mission: spec.mission,
    vision: spec.vision,
    history: spec.history,
    leader: {
      name: spec.leaderName,
      title: spec.leaderTitle,
      initials: (spec.leaderName.split(" ").at(-1) ?? spec.leaderName).slice(0, 2).toUpperCase(),
      message:
        "Our institution is committed to nurturing curious minds, advancing research, and building future-ready leaders. We invite you to explore all that our campus community has to offer.",
    },
    stats: spec.stats,
    annualFeesLpa: spec.annualFeesLpa,
    departments: spec.departments,
    programs: makePrograms(spec.departments),
    recruiters: spec.recruiters,
    placementPartners: spec.recruiters.slice(0, 5),
    successStories: makeSuccessStories(spec.recruiters),
    featuredFaculty: makeFaculty(spec.shortName, spec.departments),
    gallery: makeGallery(),
    infrastructure: [
      { name: "Central Library", detail: "250k+ volumes, digital archives and 24x7 reading zones." },
      { name: "Research Laboratories", detail: "80+ specialised labs with modern instrumentation." },
      { name: "Innovation & Incubation", detail: "Startup incubation centre with seed funding support." },
      { name: "Sports Complex", detail: "Indoor and outdoor facilities, gym and athletics track." },
      { name: "Residential Hostels", detail: "Separate hostels with dining, wifi and 24x7 security." },
      { name: "Auditorium", detail: "1,500-seat air-conditioned convention centre." },
    ],
    achievements: makeAchievements(spec.shortName),
    reviews: makeReviews(spec.shortName),
    ratingsBreakdown: {
      teaching: Math.min(5, spec.rating + 0.1),
      placement: Math.min(5, spec.rating),
      campus: Math.min(5, spec.rating - 0.1),
      faculty: Math.min(5, spec.rating),
      value: Math.min(5, spec.rating - 0.2),
    },
    facilities: {
      hostel: true,
      sports: true,
      library: true,
      labs: true,
      innovationLab: true,
      wifi: true,
    },
    admission: {
      process: [
        "Submit online application form",
        "Appear for the entrance examination / submit valid rank",
        "Attend counselling and document verification",
        "Confirm seat by paying admission fee",
      ],
      eligibility: [
        "10+2 with a minimum of 60% aggregate",
        "Valid national/state entrance examination rank",
        "Age within prescribed limits for the program",
      ],
      documents: [
        "10th & 12th mark sheets",
        "Transfer & migration certificate",
        "Entrance exam scorecard",
        "Category / income certificate (if applicable)",
        "Passport size photographs",
      ],
      fees: [
        { label: "Tuition (per year)", amount: `₹${spec.annualFeesLpa} L` },
        { label: "Hostel & mess (per year)", amount: "₹1.2 L" },
        { label: "One-time admission", amount: "₹25,000" },
      ],
      scholarships: [
        "Merit scholarship up to 100% tuition waiver",
        "Need-based financial assistance",
        "Sports & cultural excellence scholarships",
      ],
      importantDates: [
        { label: "Applications open", date: "2026-03-01" },
        { label: "Entrance examination", date: "2026-05-15" },
        { label: "Counselling begins", date: "2026-06-20" },
        { label: "Session commences", date: "2026-08-01" },
      ],
      applyUrl: `https://www.${spec.slug}.edu.in/apply`,
    },
  };
}

const SPECS: InstitutionSpec[] = [
  {
    slug: "aurora-institute-of-technology",
    name: "Aurora Institute of Technology",
    shortName: "AIT",
    tagline: "Engineering tomorrow's innovators",
    type: "engineering",
    logoInitials: "AI",
    established: 1998,
    affiliation: "Autonomous · Affiliated to State Technical University",
    city: "Hyderabad",
    state: "Telangana",
    campusAreaAcres: 120,
    rating: 4.6,
    reviewCount: 2140,
    annualFeesLpa: 2.4,
    rankings: [
      { label: "NIRF Engineering", rank: "#42" },
      { label: "State Ranking", rank: "#3" },
    ],
    accreditation: ["NAAC A++", "NBA Accredited"],
    approvals: ["AICTE", "UGC"],
    departments: ["Computer Science", "Electronics", "Mechanical", "Civil", "AI & Data Science", "Electrical"],
    recruiters: ["Google", "Microsoft", "Amazon", "TCS", "Infosys", "Deloitte"],
    stats: { students: 8400, faculty: 520, departments: 6, programs: 18, placementRate: 92, highestPackageLpa: 52, avgPackageLpa: 9.4, internships: 640 },
    overview:
      "Aurora Institute of Technology is a premier autonomous engineering institution known for its rigorous academics, thriving research culture and outstanding placement record.",
    mission: "To deliver transformative technical education that empowers students to solve real-world problems with integrity and innovation.",
    vision: "To be a globally recognised centre of excellence in engineering education and research.",
    history: "Founded in 1998, Aurora has grown from a single-building campus into a 120-acre technology hub graduating over 40,000 alumni across the globe.",
    leaderName: "Dr. Ramesh Chandra",
    leaderTitle: "Principal",
  },
  {
    slug: "meridian-university",
    name: "Meridian University",
    shortName: "MU",
    tagline: "Where knowledge meets purpose",
    type: "university",
    logoInitials: "MU",
    established: 1985,
    affiliation: "State Private University",
    city: "Bengaluru",
    state: "Karnataka",
    campusAreaAcres: 260,
    rating: 4.8,
    reviewCount: 3860,
    annualFeesLpa: 3.1,
    rankings: [
      { label: "NIRF University", rank: "#18" },
      { label: "QS India", rank: "#22" },
    ],
    accreditation: ["NAAC A++", "NBA Accredited"],
    approvals: ["UGC", "AICTE", "BCI"],
    departments: ["Computer Science", "Management", "Law", "Design", "Biotechnology", "Economics"],
    recruiters: ["Goldman Sachs", "McKinsey", "Google", "Adobe", "Flipkart", "Accenture"],
    stats: { students: 16500, faculty: 940, departments: 12, programs: 46, placementRate: 89, highestPackageLpa: 64, avgPackageLpa: 11.2, internships: 1200 },
    overview:
      "Meridian University is a multidisciplinary research university offering programs across engineering, management, law, design and the sciences on a sprawling green campus.",
    mission: "To advance knowledge and cultivate ethical, globally-minded leaders across disciplines.",
    vision: "To rank among the world's leading multidisciplinary universities.",
    history: "Established in 1985, Meridian has evolved into one of India's most respected private universities with a strong international collaboration network.",
    leaderName: "Prof. Kavita Menon",
    leaderTitle: "Vice Chancellor",
  },
  {
    slug: "silverline-medical-college",
    name: "Silverline Medical College",
    shortName: "SMC",
    tagline: "Compassion. Care. Excellence.",
    type: "medical",
    logoInitials: "SM",
    established: 1979,
    affiliation: "Affiliated to Health Sciences University",
    city: "Chennai",
    state: "Tamil Nadu",
    campusAreaAcres: 95,
    rating: 4.5,
    reviewCount: 1520,
    annualFeesLpa: 6.5,
    rankings: [
      { label: "NIRF Medical", rank: "#28" },
      { label: "State Ranking", rank: "#2" },
    ],
    accreditation: ["NAAC A+", "NABH Hospital"],
    approvals: ["NMC", "UGC"],
    departments: ["General Medicine", "Surgery", "Pediatrics", "Cardiology", "Radiology", "Orthopaedics"],
    recruiters: ["Apollo Hospitals", "Fortis", "AIIMS", "Manipal", "Narayana Health", "Medanta"],
    stats: { students: 3200, faculty: 480, departments: 18, programs: 24, placementRate: 96, highestPackageLpa: 24, avgPackageLpa: 12.5, internships: 320 },
    overview:
      "Silverline Medical College is a leading medical institution with an attached 1,200-bed teaching hospital, renowned for clinical excellence and research.",
    mission: "To train compassionate, competent healthcare professionals committed to community wellbeing.",
    vision: "To be a centre of excellence in medical education, research and patient care.",
    history: "Since 1979, Silverline has trained thousands of doctors and pioneered advanced treatment programs in the region.",
    leaderName: "Dr. Sunitha Reddy",
    leaderTitle: "Dean",
  },
  {
    slug: "crestwood-business-school",
    name: "Crestwood Business School",
    shortName: "CBS",
    tagline: "Leaders for a changing world",
    type: "business",
    logoInitials: "CB",
    established: 2004,
    affiliation: "Autonomous B-School",
    city: "Mumbai",
    state: "Maharashtra",
    campusAreaAcres: 45,
    rating: 4.7,
    reviewCount: 980,
    annualFeesLpa: 12,
    rankings: [
      { label: "NIRF Management", rank: "#12" },
      { label: "Financial Times Asia", rank: "#40" },
    ],
    accreditation: ["NAAC A++", "AACSB"],
    approvals: ["AICTE", "UGC"],
    departments: ["Finance", "Marketing", "Operations", "Human Resources", "Business Analytics", "Strategy"],
    recruiters: ["McKinsey", "BCG", "JP Morgan", "Amazon", "HUL", "KPMG"],
    stats: { students: 1800, faculty: 160, departments: 6, programs: 8, placementRate: 100, highestPackageLpa: 82, avgPackageLpa: 22.4, internships: 420 },
    overview:
      "Crestwood Business School is a top-tier management institute delivering globally benchmarked MBA and executive programs with a 100% placement record.",
    mission: "To develop principled business leaders who create sustainable value.",
    vision: "To be Asia's most impactful business school.",
    history: "Founded in 2004, Crestwood quickly rose to national prominence with its industry-integrated curriculum and stellar placements.",
    leaderName: "Prof. Arjun Malhotra",
    leaderTitle: "Director",
  },
  {
    slug: "nalanda-arts-and-science",
    name: "Nalanda College of Arts & Science",
    shortName: "NAS",
    tagline: "Curiosity without boundaries",
    type: "arts-science",
    logoInitials: "NA",
    established: 1968,
    affiliation: "Affiliated to State University",
    city: "Pune",
    state: "Maharashtra",
    campusAreaAcres: 78,
    rating: 4.3,
    reviewCount: 1240,
    annualFeesLpa: 1.2,
    rankings: [
      { label: "NIRF College", rank: "#55" },
      { label: "State Ranking", rank: "#6" },
    ],
    accreditation: ["NAAC A+"],
    approvals: ["UGC"],
    departments: ["Physics", "Chemistry", "Mathematics", "Commerce", "Psychology", "English"],
    recruiters: ["TCS", "Wipro", "Deloitte", "EY", "Cognizant", "HDFC Bank"],
    stats: { students: 9600, faculty: 410, departments: 14, programs: 32, placementRate: 78, highestPackageLpa: 18, avgPackageLpa: 5.6, internships: 380 },
    overview:
      "Nalanda College of Arts & Science offers a broad liberal education across the humanities, commerce and pure sciences with a legacy spanning five decades.",
    mission: "To foster intellectual curiosity, critical thinking and social responsibility.",
    vision: "To be a leading institution for holistic liberal education.",
    history: "Established in 1968, Nalanda is one of the oldest and most trusted arts & science colleges in the region.",
    leaderName: "Dr. Latha Krishnan",
    leaderTitle: "Principal",
  },
  {
    slug: "orion-institute-of-law",
    name: "Orion Institute of Law",
    shortName: "OIL",
    tagline: "Justice through knowledge",
    type: "law",
    logoInitials: "OL",
    established: 2001,
    affiliation: "Autonomous Law School",
    city: "New Delhi",
    state: "Delhi",
    campusAreaAcres: 32,
    rating: 4.4,
    reviewCount: 720,
    annualFeesLpa: 3.8,
    rankings: [
      { label: "NIRF Law", rank: "#15" },
      { label: "State Ranking", rank: "#2" },
    ],
    accreditation: ["NAAC A+"],
    approvals: ["BCI", "UGC"],
    departments: ["Constitutional Law", "Corporate Law", "Criminal Law", "IPR", "International Law", "Cyber Law"],
    recruiters: ["AZB & Partners", "Cyril Amarchand", "Khaitan & Co", "Trilegal", "Luthra", "PwC Legal"],
    stats: { students: 2100, faculty: 130, departments: 6, programs: 7, placementRate: 88, highestPackageLpa: 26, avgPackageLpa: 10.8, internships: 260 },
    overview:
      "Orion Institute of Law is a premier law school offering integrated and postgraduate law programs with strong moot court and litigation training.",
    mission: "To produce ethical legal professionals committed to justice and the rule of law.",
    vision: "To be a nationally leading institution for legal education and research.",
    history: "Since 2001, Orion has built a reputation for academic rigour and consistent placements in top law firms.",
    leaderName: "Prof. Neha Bansal",
    leaderTitle: "Director",
  },
];

export const INSTITUTION_DIRECTORY: InstitutionProfile[] = SPECS.map(createInstitution);

export function getInstitutionBySlug(slug: string): InstitutionProfile | undefined {
  return INSTITUTION_DIRECTORY.find((institution) => institution.slug === slug);
}

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  university: "University",
  engineering: "Engineering",
  medical: "Medical",
  business: "Business",
  "arts-science": "Arts & Science",
  law: "Law",
};

export const DISCOVERY_STATES = [...new Set(INSTITUTION_DIRECTORY.map((i) => i.location.state))].sort();
export const DISCOVERY_CITIES = [...new Set(INSTITUTION_DIRECTORY.map((i) => i.location.city))].sort();
