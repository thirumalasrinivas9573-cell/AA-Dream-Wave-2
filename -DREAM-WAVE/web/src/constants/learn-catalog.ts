import {
  SAMPLE_VIDEO_ALT,
  SAMPLE_VIDEO_HD,
  SAMPLE_VIDEO_SD,
} from "@/constants/learn";
import type { LearnAnimation } from "@/types/learn";

function chapters(
  items: Array<[string, string, number, number, string]>,
) {
  return items.map(([id, title, startSec, durationSec, summary], index) => ({
    id,
    title,
    startSec,
    durationSec,
    summary,
    captionCues: [
      {
        start: startSec,
        end: startSec + Math.min(8, durationSec),
        text: summary,
      },
      {
        start: startSec + Math.min(8, durationSec),
        end: startSec + durationSec,
        text: `${title} — key idea ${index + 1}`,
      },
    ],
  }));
}

export const LEARN_CATALOG: LearnAnimation[] = [
  {
    id: "atom-basics",
    title: "Atoms & Electron Clouds",
    description:
      "Visualize atomic structure, orbitals, and why matter behaves the way it does.",
    subject: "science",
    topic: "fundamentals",
    level: "Beginner",
    durationSec: 96,
    cover: "⚛️",
    videoSrc: SAMPLE_VIDEO_HD,
    resolutions: [
      { label: "1080p", src: SAMPLE_VIDEO_HD },
      { label: "720p", src: SAMPLE_VIDEO_SD },
      { label: "480p", src: SAMPLE_VIDEO_ALT },
    ],
    chapters: chapters([
      ["ab-1", "What is an atom?", 0, 24, "Atoms are the building blocks of matter."],
      ["ab-2", "Electrons in motion", 24, 28, "Electrons occupy probability clouds called orbitals."],
      ["ab-3", "Why chemistry happens", 52, 44, "Bonding emerges from electron interactions."],
    ]),
    quiz: [
      {
        id: "ab-q1",
        prompt: "Electrons are best described as:",
        options: [
          "Fixed planets on rings",
          "Probability clouds around the nucleus",
          "Solid spheres stuck to protons",
          "Massless light beams only",
        ],
        correctIndex: 1,
        explanation: "Modern atomic models treat electrons as probability distributions.",
      },
      {
        id: "ab-q2",
        prompt: "What drives chemical bonding?",
        options: [
          "Nuclear fission only",
          "Gravity between molecules",
          "Electron interactions",
          "Sound waves",
        ],
        correctIndex: 2,
        explanation: "Bonding is governed by how electrons are shared or transferred.",
      },
    ],
    flashcards: [
      { id: "ab-f1", front: "Orbital", back: "A region where an electron is likely to be found." },
      { id: "ab-f2", front: "Nucleus", back: "Dense center containing protons and neutrons." },
    ],
    diagram: [
      { id: "n", label: "Nucleus", x: 50, y: 50, detail: "Protons + neutrons" },
      { id: "e1", label: "1s", x: 30, y: 35, detail: "Closest orbital shell" },
      { id: "e2", label: "2p", x: 70, y: 30, detail: "Directional orbitals" },
      { id: "e3", label: "Valence", x: 72, y: 70, detail: "Outer bonding electrons" },
    ],
    relatedIds: ["forces-intro", "math-vectors"],
    tags: ["physics", "chemistry", "atoms"],
  },
  {
    id: "forces-intro",
    title: "Forces in Motion",
    description:
      "See Newton’s laws as interactive cause-and-effect with everyday examples.",
    subject: "science",
    topic: "systems",
    level: "Beginner",
    durationSec: 80,
    cover: "🚀",
    videoSrc: SAMPLE_VIDEO_SD,
    resolutions: [
      { label: "720p", src: SAMPLE_VIDEO_SD },
      { label: "480p", src: SAMPLE_VIDEO_ALT },
    ],
    chapters: chapters([
      ["fi-1", "Inertia", 0, 25, "Objects resist changes in motion."],
      ["fi-2", "F = ma", 25, 30, "Force equals mass times acceleration."],
      ["fi-3", "Action-reaction", 55, 25, "Forces come in equal and opposite pairs."],
    ]),
    quiz: [
      {
        id: "fi-q1",
        prompt: "Newton’s first law is about:",
        options: ["Energy", "Inertia", "Entropy", "Voltage"],
        correctIndex: 1,
        explanation: "Inertia describes resistance to changes in motion.",
      },
    ],
    flashcards: [
      { id: "fi-f1", front: "Force", back: "A push or pull that can change motion." },
    ],
    diagram: [
      { id: "m", label: "Mass", x: 25, y: 50, detail: "Resistance to acceleration" },
      { id: "f", label: "Force", x: 50, y: 30, detail: "Applied push/pull" },
      { id: "a", label: "Accel", x: 75, y: 50, detail: "Resulting change in velocity" },
    ],
    relatedIds: ["atom-basics", "math-vectors"],
    tags: ["physics", "newton", "motion"],
  },
  {
    id: "math-vectors",
    title: "Vectors Visualized",
    description:
      "Direction, magnitude, and vector addition through animated geometry.",
    subject: "math",
    topic: "fundamentals",
    level: "Beginner",
    durationSec: 70,
    cover: "📐",
    videoSrc: SAMPLE_VIDEO_ALT,
    resolutions: [
      { label: "720p", src: SAMPLE_VIDEO_ALT },
      { label: "1080p", src: SAMPLE_VIDEO_HD },
    ],
    chapters: chapters([
      ["mv-1", "What is a vector?", 0, 22, "A quantity with magnitude and direction."],
      ["mv-2", "Adding vectors", 22, 28, "Tip-to-tail reveals the resultant."],
      ["mv-3", "Components", 50, 20, "Break vectors into x and y parts."],
    ]),
    quiz: [
      {
        id: "mv-q1",
        prompt: "A vector has:",
        options: ["Only size", "Only direction", "Size and direction", "Neither"],
        correctIndex: 2,
        explanation: "Vectors encode both magnitude and direction.",
      },
    ],
    flashcards: [
      { id: "mv-f1", front: "Resultant", back: "The single vector equal to a sum of vectors." },
    ],
    diagram: [
      { id: "v1", label: "A", x: 30, y: 60, detail: "First vector" },
      { id: "v2", label: "B", x: 55, y: 35, detail: "Second vector" },
      { id: "r", label: "R", x: 75, y: 55, detail: "Resultant A+B" },
    ],
    relatedIds: ["forces-intro", "algo-loops"],
    tags: ["math", "vectors", "geometry"],
  },
  {
    id: "algo-loops",
    title: "Loops & Iteration",
    description:
      "Understand for/while loops as animated control flow through a problem.",
    subject: "programming",
    topic: "practice",
    level: "Beginner",
    durationSec: 88,
    cover: "🔁",
    videoSrc: SAMPLE_VIDEO_HD,
    resolutions: [
      { label: "1080p", src: SAMPLE_VIDEO_HD },
      { label: "720p", src: SAMPLE_VIDEO_SD },
    ],
    chapters: chapters([
      ["al-1", "Why loops exist", 0, 20, "Repeat work without repeating code."],
      ["al-2", "For vs while", 20, 34, "Choose loop style by exit condition."],
      ["al-3", "Common pitfalls", 54, 34, "Off-by-one errors and infinite loops."],
    ]),
    quiz: [
      {
        id: "al-q1",
        prompt: "A while loop continues until:",
        options: [
          "A fixed count always",
          "Its condition becomes false",
          "Memory is full",
          "The file ends",
        ],
        correctIndex: 1,
        explanation: "While loops evaluate a condition each iteration.",
      },
    ],
    flashcards: [
      { id: "al-f1", front: "Iteration", back: "One pass through a loop body." },
      { id: "al-f2", front: "Off-by-one", back: "Looping one too many or too few times." },
    ],
    diagram: [
      { id: "s", label: "Start", x: 20, y: 50, detail: "Initialize counter" },
      { id: "c", label: "Check", x: 50, y: 30, detail: "Condition true?" },
      { id: "b", label: "Body", x: 50, y: 70, detail: "Do work + update" },
      { id: "e", label: "End", x: 80, y: 50, detail: "Exit loop" },
    ],
    relatedIds: ["react-state", "math-vectors"],
    tags: ["programming", "loops", "algorithms"],
  },
  {
    id: "react-state",
    title: "React State Flow",
    description:
      "Watch UI state update as a reactive data pipeline with renders.",
    subject: "programming",
    topic: "systems",
    level: "Intermediate",
    durationSec: 92,
    cover: "⚛️",
    videoSrc: SAMPLE_VIDEO_SD,
    resolutions: [
      { label: "720p", src: SAMPLE_VIDEO_SD },
      { label: "1080p", src: SAMPLE_VIDEO_HD },
    ],
    chapters: chapters([
      ["rs-1", "State as memory", 0, 26, "Components remember values across renders."],
      ["rs-2", "Updates trigger renders", 26, 32, "setState schedules a fresh UI pass."],
      ["rs-3", "Derived UI", 58, 34, "Render output from current state + props."],
    ]),
    quiz: [
      {
        id: "rs-q1",
        prompt: "Calling setState typically:",
        options: [
          "Mutates DOM directly forever",
          "Schedules a re-render",
          "Deletes the component",
          "Stops event handlers",
        ],
        correctIndex: 1,
        explanation: "State updates enqueue a re-render with new values.",
      },
    ],
    flashcards: [
      { id: "rs-f1", front: "Render", back: "React computing UI from props and state." },
    ],
    diagram: [
      { id: "ev", label: "Event", x: 20, y: 40, detail: "User action" },
      { id: "st", label: "State", x: 50, y: 30, detail: "Updated value" },
      { id: "rn", label: "Render", x: 50, y: 70, detail: "UI recalculated" },
      { id: "dm", label: "Commit", x: 80, y: 50, detail: "DOM updates" },
    ],
    relatedIds: ["algo-loops", "ux-hierarchy"],
    tags: ["react", "state", "frontend"],
  },
  {
    id: "ux-hierarchy",
    title: "Visual Hierarchy",
    description:
      "Learn how size, contrast, and spacing guide attention in interfaces.",
    subject: "design",
    topic: "fundamentals",
    level: "Beginner",
    durationSec: 75,
    cover: "🎨",
    videoSrc: SAMPLE_VIDEO_ALT,
    resolutions: [
      { label: "720p", src: SAMPLE_VIDEO_ALT },
      { label: "480p", src: SAMPLE_VIDEO_SD },
    ],
    chapters: chapters([
      ["ux-1", "What users see first", 0, 22, "Contrast and scale create priority."],
      ["ux-2", "Spacing systems", 22, 28, "Rhythm reduces cognitive load."],
      ["ux-3", "Scan patterns", 50, 25, "Design for F and Z reading patterns."],
    ]),
    quiz: [
      {
        id: "ux-q1",
        prompt: "Hierarchy primarily helps users:",
        options: [
          "Download faster",
          "Know what matters first",
          "Write CSS variables",
          "Encrypt data",
        ],
        correctIndex: 1,
        explanation: "Hierarchy directs attention to primary content and actions.",
      },
    ],
    flashcards: [
      { id: "ux-f1", front: "Contrast", back: "Difference that makes elements stand out." },
    ],
    diagram: [
      { id: "h1", label: "H1", x: 50, y: 25, detail: "Primary focal point" },
      { id: "b", label: "Body", x: 50, y: 50, detail: "Supporting detail" },
      { id: "cta", label: "CTA", x: 50, y: 75, detail: "Action emphasis" },
    ],
    relatedIds: ["react-state", "market-fit"],
    tags: ["design", "ux", "hierarchy"],
  },
  {
    id: "market-fit",
    title: "Product-Market Fit Signals",
    description:
      "Animated checklist for recognizing early product-market fit evidence.",
    subject: "business",
    topic: "career",
    level: "Intermediate",
    durationSec: 84,
    cover: "📈",
    videoSrc: SAMPLE_VIDEO_HD,
    resolutions: [
      { label: "1080p", src: SAMPLE_VIDEO_HD },
      { label: "720p", src: SAMPLE_VIDEO_SD },
    ],
    chapters: chapters([
      ["mf-1", "Problem intensity", 0, 24, "Users urgently need the outcome."],
      ["mf-2", "Retention clues", 24, 30, "People return without heavy prompts."],
      ["mf-3", "Willingness to pay", 54, 30, "Value shows up in conversion behavior."],
    ]),
    quiz: [
      {
        id: "mf-q1",
        prompt: "A strong early PMF signal is:",
        options: [
          "Vanity pageviews only",
          "Organic retention and referrals",
          "More features shipped",
          "Darker brand colors",
        ],
        correctIndex: 1,
        explanation: "Retention and word-of-mouth indicate real value.",
      },
    ],
    flashcards: [
      { id: "mf-f1", front: "PMF", back: "When a product satisfies a strong market need." },
    ],
    diagram: [
      { id: "p", label: "Problem", x: 25, y: 40, detail: "Pain intensity" },
      { id: "s", label: "Solution", x: 50, y: 60, detail: "Product promise" },
      { id: "m", label: "Market", x: 75, y: 40, detail: "Buyers + demand" },
    ],
    relatedIds: ["ux-hierarchy", "algo-loops"],
    tags: ["business", "pmf", "product"],
  },
];

export function getLearnAnimation(id: string) {
  return LEARN_CATALOG.find((item) => item.id === id) ?? null;
}

export function getLearnBySubject(subject: string) {
  return LEARN_CATALOG.filter((item) => item.subject === subject);
}

export function getRelatedAnimations(id: string) {
  const item = getLearnAnimation(id);
  if (!item) return [];
  return item.relatedIds
    .map((relatedId) => getLearnAnimation(relatedId))
    .filter((entry): entry is LearnAnimation => Boolean(entry));
}
