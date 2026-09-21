import {
  AI_RECOMMENDED_TOPICS,
} from "@/constants/knowledge";
import type {
  BookDifficulty,
  KnowledgeBook,
} from "@/types/knowledge";

const samplePdf =
  "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

type CatalogSeed = Omit<
  KnowledgeBook,
  "authorBio" | "difficulty" | "importantPoints" | "learningPath"
>;

type BookEnrichment = {
  authorBio: string;
  difficulty: BookDifficulty;
  importantPoints: string[];
  learningPath: string[];
};

function chapter(
  id: string,
  title: string,
  summary: string,
  paragraphs: string[],
): KnowledgeBook["chapters"][number] {
  return {
    id,
    title,
    pages: Math.max(4, paragraphs.join(" ").split(/\s+/).length / 40),
    summary,
    content: paragraphs.join("\n\n"),
  };
}

const BOOK_ENRICHMENT: Record<string, BookEnrichment> = {
  "atomic-habits": {
    difficulty: "beginner",
    authorBio:
      "James Clear writes about habits, decision-making, and continuous improvement for individuals and teams.",
    importantPoints: [
      "Systems beat goals",
      "Environment beats willpower",
      "Identity drives lasting behavior",
    ],
    learningPath: [
      "Define desired identity",
      "Design obvious cues",
      "Shrink starting friction",
      "Track satisfying streaks",
    ],
  },
  "deep-work": {
    difficulty: "intermediate",
    authorBio:
      "Cal Newport researches how knowledge workers produce rare, high-value cognitive output.",
    importantPoints: [
      "Depth is scarce and valuable",
      "Shallow work crowds calendars",
      "Rituals protect focus",
    ],
    learningPath: [
      "Audit shallow work",
      "Schedule deep blocks",
      "Create a shutdown ritual",
      "Measure deep hours",
    ],
  },
  "psychology-of-money": {
    difficulty: "beginner",
    authorBio:
      "Morgan Housel is a partner at Collaborative Fund and an essayist on money behavior.",
    importantPoints: [
      "Behavior beats spreadsheets",
      "Leave room for error",
      "Compounding needs time",
    ],
    learningPath: [
      "Map personal money stories",
      "Define enough",
      "Build a margin of safety",
      "Stay consistent",
    ],
  },
  mindset: {
    difficulty: "beginner",
    authorBio:
      "Carol S. Dweck is a Stanford psychologist known for research on fixed and growth mindsets.",
    importantPoints: [
      "Beliefs shape learning behavior",
      "Praise process over talent",
      "Treat feedback as information",
    ],
    learningPath: [
      "Spot fixed language",
      "Reframe challenge",
      "Practice feedback loops",
      "Coach growth in others",
    ],
  },
  grit: {
    difficulty: "intermediate",
    authorBio:
      "Angela Duckworth studies grit, self-control, and predictors of long-term achievement.",
    importantPoints: [
      "Effort counts twice",
      "Interest, practice, purpose, and hope sustain grit",
      "Persistence is not burnout",
    ],
    learningPath: [
      "Clarify a long-horizon goal",
      "Design deliberate practice",
      "Connect effort to purpose",
      "Build recovery habits",
    ],
  },
  "zero-to-one": {
    difficulty: "advanced",
    authorBio:
      "Peter Thiel is an entrepreneur and investor focused on unique innovation and monopoly creation.",
    importantPoints: [
      "0 to 1 creates new value",
      "Seek secrets about the world",
      "Build durable differentiation",
    ],
    learningPath: [
      "Find a useful secret",
      "Define a monopoly thesis",
      "Ship a unique wedge",
      "Defend lasting advantage",
    ],
  },
  "lean-startup": {
    difficulty: "intermediate",
    authorBio:
      "Eric Ries popularized lean methods for building products under extreme uncertainty.",
    importantPoints: [
      "Validated learning is progress",
      "MVPs reduce waste",
      "Pivot or persevere with evidence",
    ],
    learningPath: [
      "State leap-of-faith assumptions",
      "Build an MVP",
      "Measure actionable metrics",
      "Decide to pivot or persevere",
    ],
  },
  sapiens: {
    difficulty: "intermediate",
    authorBio:
      "Yuval Noah Harari is a historian exploring large-scale human cooperation and shared myths.",
    importantPoints: [
      "Shared myths enable scale",
      "Agriculture changed tradeoffs",
      "Science amplifies institutional power",
    ],
    learningPath: [
      "Map shared organizational fictions",
      "Study institutional myths",
      "Connect history to org design",
    ],
  },
  "so-good": {
    difficulty: "intermediate",
    authorBio:
      "Cal Newport writes about career strategy and the craftsman approach to rare skills.",
    importantPoints: [
      "Skills come before passion",
      "Career capital creates options",
      "Mission follows mastery",
    ],
    learningPath: [
      "Pick a craft",
      "Practice deliberately",
      "Acquire rare skills",
      "Negotiate for control",
    ],
  },
  "art-of-learning": {
    difficulty: "advanced",
    authorBio:
      "Josh Waitzkin is a chess and martial arts champion teaching transferable principles of mastery.",
    importantPoints: [
      "Depth beats early breadth",
      "Invest in loss as training",
      "Transfer principles across domains",
    ],
    learningPath: [
      "Master fundamentals",
      "Embrace productive adversity",
      "Build soft-zone resilience",
      "Transfer learning across fields",
    ],
  },
};

const CATALOG_SEED: CatalogSeed[] = [
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    category: "Productivity",
    subject: "Behavior Design",
    description:
      "A practical framework for building good habits and breaking bad ones with tiny, compounding improvements.",
    cover: "📗",
    rating: 5,
    pages: 320,
    language: "English",
    publishedYear: 2018,
    libraries: ["personal", "public", "institution"],
    tags: ["habits", "focus", "systems"],
    pdfUrl: samplePdf,
    relatedIds: ["deep-work", "mindset", "grit"],
    aiSummary:
      "Clear argues that outcomes are lagging measures of systems. Identity-based habits, environment design, and the Four Laws of Behavior Change create lasting progress.",
    keyConcepts: [
      "1% improvements compound",
      "Identity-based habits",
      "Cue → Craving → Response → Reward",
      "Make it obvious, attractive, easy, satisfying",
    ],
    chapters: [
      chapter(
        "ah-1",
        "The Surprising Power of Atomic Habits",
        "Tiny habits compound into remarkable results over time.",
        [
          "Habits are the compound interest of self-improvement. Getting 1% better every day creates exponential growth.",
          "You do not rise to the level of your goals. You fall to the level of your systems.",
          "Focus on trajectory, not a single outcome. Consistency beats intensity when building skill and character.",
        ],
      ),
      chapter(
        "ah-2",
        "How Your Habits Shape Your Identity",
        "The most effective way to change habits is to focus on who you wish to become.",
        [
          "Every action is a vote for the type of person you wish to become.",
          "Start by deciding the identity you want, then prove it with small wins.",
          "Behavior change is identity change. Outcomes follow identity.",
        ],
      ),
      chapter(
        "ah-3",
        "The Four Laws of Behavior Change",
        "A simple framework for creating good habits and breaking bad ones.",
        [
          "Make it obvious. Design cues into your environment so the right action is hard to miss.",
          "Make it attractive. Pair habits with rewards and social reinforcement.",
          "Make it easy. Reduce friction until starting takes less than two minutes.",
          "Make it satisfying. Immediate feedback closes the loop and reinforces repetition.",
        ],
      ),
    ],
  },
  {
    id: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    category: "Productivity",
    subject: "Focus & Attention",
    description:
      "Rules for focused success in a distracted world, emphasizing depth over shallow busyness.",
    cover: "📘",
    rating: 5,
    pages: 296,
    language: "English",
    publishedYear: 2016,
    libraries: ["personal", "company", "public"],
    tags: ["focus", "career", "attention"],
    pdfUrl: samplePdf,
    relatedIds: ["atomic-habits", "so-good", "lean-startup"],
    aiSummary:
      "Newport defines deep work as cognitively demanding activity performed without distraction. Professionals who protect deep work create rare and valuable output.",
    keyConcepts: [
      "Deep vs shallow work",
      "Attention residue",
      "Ritualize depth",
      "Quit social media by default",
    ],
    chapters: [
      chapter(
        "dw-1",
        "Deep Work Is Valuable",
        "In an economy of distraction, depth is a competitive advantage.",
        [
          "The ability to perform deep work is becoming increasingly rare and increasingly valuable.",
          "Shallow work can feel productive while producing little of lasting worth.",
          "Protect long, uninterrupted blocks for complex problem solving and creative synthesis.",
        ],
      ),
      chapter(
        "dw-2",
        "Deep Work Is Rare",
        "Modern workplaces often optimize for busyness instead of depth.",
        [
          "Open offices, instant messaging, and always-on culture fragment attention.",
          "Attention residue from task switching reduces cognitive performance.",
          "Leaders should redesign workflows to protect focus rather than celebrate responsiveness alone.",
        ],
      ),
      chapter(
        "dw-3",
        "Work Deeply",
        "Rituals, scheduling, and environment make depth sustainable.",
        [
          "Choose a depth philosophy that matches your role: monastic, bimodal, rhythmic, or journalistic.",
          "Build rituals for start time, location, and shutdown to reduce decision fatigue.",
          "Measure deep hours. What gets measured gets improved.",
        ],
      ),
    ],
  },
  {
    id: "psychology-of-money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Finance",
    subject: "Behavioral Finance",
    description:
      "Timeless lessons on wealth, greed, and happiness through stories about how people think about money.",
    cover: "📙",
    rating: 5,
    pages: 256,
    language: "English",
    publishedYear: 2020,
    libraries: ["public", "personal", "institution"],
    tags: ["money", "behavior", "wealth"],
    relatedIds: ["sapiens", "zero-to-one"],
    aiSummary:
      "Housel shows that financial outcomes are driven less by spreadsheets and more by behavior, luck, and personal history. Reasonable decisions beat perfect forecasts.",
    keyConcepts: [
      "Wealth is what you don't see",
      "Room for error",
      "Compounding needs time",
      "Reasonable > rational",
    ],
    chapters: [
      chapter(
        "pm-1",
        "No One's Crazy",
        "Money decisions are shaped by unique life experiences.",
        [
          "Your personal history with money is more persuasive than any spreadsheet.",
          "People make financial choices that look irrational from the outside but coherent from their story.",
          "Empathy for different money narratives improves advising and teamwork.",
        ],
      ),
      chapter(
        "pm-2",
        "Luck & Risk",
        "Outcomes are a mix of skill, luck, and risk.",
        [
          "Be careful who you praise and who you punish. Results include luck.",
          "Focus on processes that survive bad luck rather than strategies that require perfect conditions.",
          "Room for error is a feature, not a bug.",
        ],
      ),
    ],
  },
  {
    id: "mindset",
    title: "Mindset",
    author: "Carol S. Dweck",
    category: "Psychology",
    subject: "Learning Science",
    description:
      "The psychology of success through growth mindset versus fixed mindset.",
    cover: "📕",
    rating: 5,
    pages: 320,
    language: "English",
    publishedYear: 2006,
    libraries: ["institution", "public", "personal"],
    tags: ["learning", "education", "growth"],
    relatedIds: ["grit", "atomic-habits", "art-of-learning"],
    aiSummary:
      "Dweck contrasts fixed and growth mindsets. Learners who treat ability as developable persist longer, seek feedback, and improve faster.",
    keyConcepts: [
      "Fixed vs growth mindset",
      "Praise process not talent",
      "Effort as a path to mastery",
      "Feedback as information",
    ],
    chapters: [
      chapter(
        "ms-1",
        "The Mindsets",
        "Beliefs about ability shape learning behavior.",
        [
          "In a fixed mindset, talent is static and failure is identity threat.",
          "In a growth mindset, challenge is information and effort is the point.",
          "Classrooms and companies can design for growth by how they give feedback.",
        ],
      ),
      chapter(
        "ms-2",
        "The Truth About Ability and Accomplishment",
        "Achievement is cultivated through strategies and persistence.",
        [
          "High performers often look talented because they practiced deliberately.",
          "Avoiding challenges protects ego but stalls development.",
          "Celebrate strategies, recovery from setbacks, and learning velocity.",
        ],
      ),
    ],
  },
  {
    id: "grit",
    title: "Grit",
    author: "Angela Duckworth",
    category: "Psychology",
    subject: "Motivation",
    description:
      "Passion and perseverance as predictors of long-term achievement.",
    cover: "📗",
    rating: 4,
    pages: 352,
    language: "English",
    publishedYear: 2016,
    libraries: ["institution", "company", "public"],
    tags: ["perseverance", "goals", "practice"],
    relatedIds: ["mindset", "deep-work", "atomic-habits"],
    aiSummary:
      "Duckworth defines grit as sustained passion and perseverance toward long-term goals. Interest, practice, purpose, and hope form the grit pathway.",
    keyConcepts: [
      "Grit = passion + perseverance",
      "Deliberate practice",
      "Purpose amplifies effort",
      "Hope sustains persistence",
    ],
    chapters: [
      chapter(
        "gr-1",
        "What Grit Is and Why It Matters",
        "Effort counts twice in achievement.",
        [
          "Talent x effort = skill. Skill x effort = achievement.",
          "Gritty people stay committed to goals that take years, not weeks.",
          "Organizations can hire and coach for grit without romanticizing burnout.",
        ],
      ),
    ],
  },
  {
    id: "zero-to-one",
    title: "Zero to One",
    author: "Peter Thiel",
    category: "Entrepreneurship",
    subject: "Startups",
    description:
      "Notes on startups and how to build the future through unique innovation.",
    cover: "📗",
    rating: 4,
    pages: 224,
    language: "English",
    publishedYear: 2014,
    libraries: ["company", "public", "personal"],
    tags: ["startups", "innovation", "strategy"],
    relatedIds: ["lean-startup", "psychology-of-money"],
    aiSummary:
      "Thiel argues that progress from 0 to 1 creates monopolies of unique value. Copying is 1 to n. Founders should seek secrets and durable differentiation.",
    keyConcepts: [
      "0 to 1 vs 1 to n",
      "Creative monopoly",
      "Secrets about the world",
      "Definite optimism",
    ],
    chapters: [
      chapter(
        "z1-1",
        "The Challenge of the Future",
        "Horizontal progress copies; vertical progress invents.",
        [
          "Globalization is 1 to n. Technology is 0 to 1.",
          "The next Bill Gates will not build an operating system.",
          "Ask what valuable company nobody is building.",
        ],
      ),
    ],
  },
  {
    id: "lean-startup",
    title: "The Lean Startup",
    author: "Eric Ries",
    category: "Entrepreneurship",
    subject: "Product Development",
    description:
      "Build-measure-learn loops for creating products under extreme uncertainty.",
    cover: "📔",
    rating: 4,
    pages: 336,
    language: "English",
    publishedYear: 2011,
    libraries: ["company", "institution", "public"],
    tags: ["mvp", "experimentation", "product"],
    relatedIds: ["zero-to-one", "deep-work"],
    aiSummary:
      "Ries teaches validated learning through MVPs and actionable metrics. Startups should treat strategy as a series of experiments.",
    keyConcepts: [
      "Build-Measure-Learn",
      "Minimum viable product",
      "Innovation accounting",
      "Pivot or persevere",
    ],
    chapters: [
      chapter(
        "ls-1",
        "Start",
        "Entrepreneurship is management under uncertainty.",
        [
          "A startup is a human institution designed to create a new product under conditions of extreme uncertainty.",
          "Validated learning is the unit of progress.",
          "Ship to learn, not to impress.",
        ],
      ),
    ],
  },
  {
    id: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "History",
    subject: "Human Civilization",
    description:
      "A brief history of humankind covering cognitive, agricultural, and scientific revolutions.",
    cover: "📓",
    rating: 5,
    pages: 464,
    language: "English",
    publishedYear: 2011,
    libraries: ["public", "institution"],
    tags: ["history", "culture", "systems"],
    relatedIds: ["psychology-of-money", "mindset"],
    aiSummary:
      "Harari narrates how shared myths, agriculture, and science reshaped human cooperation and power. Stories enable large-scale collaboration.",
    keyConcepts: [
      "Cognitive revolution",
      "Shared fictions",
      "Agricultural tradeoffs",
      "Scientific method as power",
    ],
    chapters: [
      chapter(
        "sp-1",
        "An Animal of No Significance",
        "Homo sapiens rose through flexible cooperation.",
        [
          "Our species succeeded by believing in shared imagined realities.",
          "Money, nations, and corporations are powerful stories.",
          "Understanding myths helps leaders design institutions.",
        ],
      ),
    ],
  },
  {
    id: "so-good",
    title: "So Good They Can't Ignore You",
    author: "Cal Newport",
    category: "Career",
    subject: "Career Strategy",
    description:
      "Why skills trump passion in building rare and valuable careers.",
    cover: "📙",
    rating: 5,
    pages: 304,
    language: "English",
    publishedYear: 2012,
    libraries: ["personal", "institution", "company"],
    tags: ["career", "skills", "craftsman"],
    relatedIds: ["deep-work", "grit"],
    aiSummary:
      "Newport challenges follow-your-passion advice. Career capital from rare skills creates control, creativity, and impact.",
    keyConcepts: [
      "Career capital",
      "Craftsman mindset",
      "Control traps",
      "Mission after mastery",
    ],
    chapters: [
      chapter(
        "sg-1",
        "The Passion Hypothesis Is Flawed",
        "Passion often follows mastery, not the other way around.",
        [
          "Self-determination thrives with autonomy, competence, and relatedness.",
          "Build rare skills first, then negotiate for the work you love.",
          "Mission emerges from the cutting edge of your field.",
        ],
      ),
    ],
  },
  {
    id: "art-of-learning",
    title: "The Art of Learning",
    author: "Josh Waitzkin",
    category: "Learning",
    subject: "Deliberate Practice",
    description:
      "Mastery principles from chess and martial arts applied to any discipline.",
    cover: "📘",
    rating: 5,
    pages: 288,
    language: "English",
    publishedYear: 2007,
    libraries: ["personal", "institution", "public"],
    tags: ["mastery", "practice", "performance"],
    relatedIds: ["mindset", "deep-work", "grit"],
    aiSummary:
      "Waitzkin shows how beginners can accelerate by learning fundamentals deeply, embracing adversity, and transferring principles across domains.",
    keyConcepts: [
      "Numbers to leave numbers",
      "Investment in loss",
      "Soft zone resilience",
      "Making smaller circles",
    ],
    chapters: [
      chapter(
        "al-1",
        "Foundations of Mastery",
        "Depth beats breadth in early learning.",
        [
          "Internalize fundamentals until intuition carries complexity.",
          "Use setbacks as training data rather than identity threats.",
          "Transfer learning by abstracting principles across fields.",
        ],
      ),
    ],
  },
];

function enrichBook(seed: CatalogSeed): KnowledgeBook {
  const meta = BOOK_ENRICHMENT[seed.id];
  return {
    ...seed,
    authorBio:
      meta?.authorBio ??
      `${seed.author} is featured in the Dream Wave knowledge catalog.`,
    difficulty: meta?.difficulty ?? "intermediate",
    importantPoints: meta?.importantPoints ?? seed.keyConcepts.slice(0, 3),
    learningPath: meta?.learningPath ?? seed.keyConcepts,
  };
}

export const KNOWLEDGE_CATALOG: KnowledgeBook[] =
  CATALOG_SEED.map(enrichBook);

export function getBookById(id: string): KnowledgeBook | undefined {
  return KNOWLEDGE_CATALOG.find((book) => book.id === id);
}

export function getRelatedBooks(book: KnowledgeBook): KnowledgeBook[] {
  return book.relatedIds
    .map((id) => getBookById(id))
    .filter((item): item is KnowledgeBook => Boolean(item));
}

export function getTrendingBooks(limit = 4): KnowledgeBook[] {
  return [...KNOWLEDGE_CATALOG]
    .sort((a, b) => b.rating - a.rating || b.publishedYear - a.publishedYear)
    .slice(0, limit);
}

export function getRecentlyAddedBooks(limit = 4): KnowledgeBook[] {
  return [...KNOWLEDGE_CATALOG]
    .sort((a, b) => b.publishedYear - a.publishedYear)
    .slice(0, limit);
}

export function getBooksByAuthor(author: string): KnowledgeBook[] {
  return KNOWLEDGE_CATALOG.filter((book) => book.author === author);
}

export function getRecommendedForTopic(topicId: string): KnowledgeBook[] {
  const topic = AI_RECOMMENDED_TOPICS.find((item) => item.id === topicId);
  if (!topic) return getTrendingBooks(4);
  return topic.relatedBookIds
    .map((id) => getBookById(id))
    .filter((item): item is KnowledgeBook => Boolean(item));
}
