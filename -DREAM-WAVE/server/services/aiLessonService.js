const { robustAiCall } = require('./openaiService')
const { getOpenAI } = require('../utils/openaiClient')
const client = new Proxy({}, { get(_t, p) { return getOpenAI()[p]; } })

// ── AI Lesson Generator — Cinematic Learning Engine ───────────────────────────
// Generates structured video-style lessons with scenes, narration, visuals

const FALLBACK_LESSON = {
  title: 'Introduction to the Topic',
  totalDuration: '8 minutes',
  difficulty: 'Beginner',
  keyTakeaways: [
    'Understand the core concept and why it matters',
    'See real-world applications in industry',
    'Practice with hands-on examples',
    'Build confidence to move to the next skill'
  ],
  scenes: [
    {
      id: 1,
      title: 'What is this and why does it matter?',
      duration: '2 min',
      type: 'introduction',
      narration: 'Welcome to this lesson. Today we explore one of the most important concepts in your learning journey. Understanding this topic will open doors to new skills, better career opportunities, and deeper technical mastery. Whether you are a complete beginner or looking to solidify your foundation, this lesson will give you the clarity and confidence you need.',
      visual: 'Concept title appears with animated particles. Key words highlight one by one.',
      animation: 'Fade in title, particles orbit around concept name, key words pulse with blue glow',
      keyPoints: ['Core definition', 'Real-world relevance', 'Career impact'],
      codeExample: null
    },
    {
      id: 2,
      title: 'Core Structure and Building Blocks',
      duration: '3 min',
      type: 'concept',
      narration: 'Every complex system is built from simple, repeatable building blocks. In this section, we break down the core structure of this topic. Think of it like learning the alphabet before writing sentences — once you master these fundamentals, everything else becomes logical and predictable. We will use visual diagrams to show how each piece connects to the others.',
      visual: 'Hierarchical diagram builds from top to bottom. Each node appears with a connection line.',
      animation: 'Nodes appear sequentially, connection lines draw themselves, completed nodes glow green',
      keyPoints: ['Primary components', 'How they connect', 'What each one does'],
      codeExample: null
    },
    {
      id: 3,
      title: 'Live Example — See it in Action',
      duration: '3 min',
      type: 'example',
      narration: 'The fastest way to understand any concept is to see it working in a real context. Watch as we build a complete example from scratch. Notice how each piece we discussed in the previous section comes together. This is the moment where theory transforms into practice — and where real learning happens.',
      visual: 'Split screen: code/concept on left, visual output on right. Changes animate in real-time.',
      animation: 'Code appears line by line, output builds simultaneously on right side, final result pulses with success glow',
      keyPoints: ['Step-by-step construction', 'Real output', 'Practical application'],
      codeExample: '// Example code will appear here based on the specific topic'
    }
  ],
  quiz: [
    {
      id: 1,
      type: 'mcq',
      question: 'What is the primary purpose of this concept?',
      options: ['To organize and structure information', 'To make code run faster', 'To connect databases', 'To style visual elements'],
      correct: 0,
      explanation: 'The primary purpose is to organize and structure information in a meaningful, accessible way.'
    },
    {
      id: 2,
      type: 'true_false',
      question: 'Every piece of this concept can be broken down into smaller, reusable components.',
      correct: true,
      explanation: 'Yes — modular thinking is fundamental to this concept. Breaking things into small, reusable pieces is the key principle.'
    },
    {
      id: 3,
      type: 'scenario',
      question: 'You are building a real project and need to implement this concept. What is the FIRST thing you should do?',
      options: ['Start writing code immediately', 'Plan the structure before writing anything', 'Search for tutorials', 'Copy existing examples'],
      correct: 1,
      explanation: 'Always plan the structure first. Understanding what you need before writing code saves hours of debugging and refactoring.'
    }
  ],
  mindMap: {
    center: 'Core Concept',
    branches: [
      { label: 'Structure', children: ['Components', 'Hierarchy', 'Relationships'] },
      { label: 'Applications', children: ['Real Projects', 'Industry Use', 'Career Value'] },
      { label: 'Next Steps', children: ['Practice', 'Build Projects', 'Advanced Topics'] }
    ]
  },
  practiceExercise: {
    title: 'Hands-on Practice Exercise',
    description: 'Apply what you learned by completing this structured exercise. This will take approximately 30-45 minutes.',
    steps: [
      'Set up your environment and create a new project file',
      'Implement the core structure using the concepts from this lesson',
      'Add at least 3 different examples showing different variations',
      'Test your implementation and verify it works correctly',
      'Document what you built with comments explaining each part'
    ],
    expectedOutcome: 'A working implementation that demonstrates your understanding of all key concepts from this lesson.'
  },
  resources: [
    { type: 'documentation', title: 'Official Documentation', description: 'The authoritative source for this topic' },
    { type: 'book', title: 'Recommended Book', description: 'Deep dive into the fundamentals' },
    { type: 'practice', title: 'Practice Platform', description: 'Hundreds of exercises to build mastery' }
  ]
}

/**
 * Generate a complete cinematic AI lesson for a topic.
 * Returns scenes with narration, visuals, animation descriptions,
 * quiz questions, mind map, and practice exercise.
 */
exports.generateLesson = async (topic, category, difficulty = 'Beginner', context = '') => {
  const messages = [
    {
      role: 'system',
      content: `You are an elite AI learning architect and educational content creator.
You design cinematic, interactive lessons that rival Khan Academy + Brilliant + Apple's educational content.

YOUR MANDATE:
- Create lessons that are visually rich, deeply educational, and engaging
- Every narration must be 100-200 words — real teaching, not summaries
- Every visual description must be specific and implementable
- Real code examples for technical topics
- Real equations for math topics  
- Real experiments for science topics
- Quizzes must have detailed explanations

RETURN ONLY valid JSON. No markdown, no code blocks.`,
    },
    {
      role: 'user',
      content: `Generate a complete cinematic AI lesson for:

TOPIC: "${topic}"
CATEGORY: ${category}
DIFFICULTY: ${difficulty}
${context ? 'CONTEXT: ' + context : ''}

Return JSON with this EXACT structure:
{
  "title": "Engaging lesson title",
  "totalDuration": "X minutes",
  "difficulty": "${difficulty}",
  "keyTakeaways": ["takeaway 1 (20-30 words)", "takeaway 2", "takeaway 3", "takeaway 4"],
  "scenes": [
    {
      "id": 1,
      "title": "Scene title",
      "duration": "2 min",
      "type": "introduction|concept|example|demo|summary",
      "narration": "150-200 words of engaging educational narration. Teach like a great professor. Use analogies. Make it memorable. Connect to real world.",
      "visual": "Specific description of what appears on screen — diagrams, code, animations",
      "animation": "Detailed animation sequence — what moves, when, how",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "codeExample": "actual code if technical topic, null if not"
    }
  ],
  "quiz": [
    {
      "id": 1,
      "type": "mcq",
      "question": "Meaningful question testing deep understanding",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "50-80 word explanation of why this answer is correct and what it teaches"
    },
    {
      "id": 2,
      "type": "scenario",
      "question": "Real-world scenario question",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 1,
      "explanation": "50-80 word explanation"
    },
    {
      "id": 3,
      "type": "true_false",
      "question": "True/false statement about a key concept",
      "correct": true,
      "explanation": "50-80 word explanation"
    },
    {
      "id": 4,
      "type": "mcq",
      "question": "Application question testing practical understanding",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 2,
      "explanation": "50-80 word explanation"
    },
    {
      "id": 5,
      "type": "mcq",
      "question": "Advanced conceptual question",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 3,
      "explanation": "50-80 word explanation"
    }
  ],
  "mindMap": {
    "center": "Topic name",
    "branches": [
      { "label": "Branch 1", "children": ["child 1", "child 2", "child 3"] },
      { "label": "Branch 2", "children": ["child 1", "child 2", "child 3"] },
      { "label": "Branch 3", "children": ["child 1", "child 2", "child 3"] },
      { "label": "Branch 4", "children": ["child 1", "child 2", "child 3"] }
    ]
  },
  "practiceExercise": {
    "title": "Hands-on exercise title",
    "description": "100-150 word description of what to build/do and why",
    "steps": ["step 1 (30-50 words)", "step 2", "step 3", "step 4", "step 5"],
    "expectedOutcome": "What the student will have built/learned"
  },
  "resources": [
    { "type": "documentation", "title": "Exact resource name", "description": "Why this resource" },
    { "type": "book", "title": "Exact book title by Author", "description": "What this book teaches" },
    { "type": "practice", "title": "Platform name", "description": "What to practice there" },
    { "type": "video", "title": "Specific video/channel", "description": "Why to watch this" }
  ]
}

Requirements:
- 4-6 scenes minimum
- narration must be 100-200 words each (MANDATORY)
- 5 quiz questions with detailed explanations
- Mind map with 4 branches
- Real code for technical topics, real equations for math, real experiments for science
- practiceExercise steps must be 30-50 words each`
    }
  ]

  const result = await robustAiCall(messages, 'gpt-4o-mini', FALLBACK_LESSON)

  if (!result.scenes || !Array.isArray(result.scenes)) {
    console.warn('[aiLessonService] Invalid structure, using fallback')
    return FALLBACK_LESSON
  }

  return result
}

module.exports = exports

// ── Video Script Generator ─────────────────────────────────────────────────────
// Generates a full cinematic video script with motion graphics directions,
// scene-by-scene breakdowns, and narration timing.

const VIDEO_FALLBACK = {
  title: 'Topic Introduction Video',
  totalDuration: '5 minutes',
  format: '16:9 Cinematic',
  scenes: [
    {
      sceneNumber: 1,
      title: 'Hook — Why This Matters',
      duration: '30s',
      narration: 'In the next 5 minutes, you will understand something that most people spend months trying to figure out on their own.',
      motionGraphics: 'Dark background with particle field. Title text reveals with a light sweep left to right.',
      voiceDirection: 'Confident, energetic, slightly mysterious tone',
      onScreen: ['Topic title', 'Key statistic or fact'],
      transition: 'Fade through black',
    },
    {
      sceneNumber: 2,
      title: 'Core Concept Introduction',
      duration: '60s',
      narration: 'The core idea is simple. Once you see it, you cannot unsee it. Everything else builds from this single foundation.',
      motionGraphics: 'Clean white or dark canvas. Key concept word appears large, then breaks into component parts with connecting lines.',
      voiceDirection: 'Clear, measured pace. Pause after the key definition.',
      onScreen: ['Definition card', 'Visual analogy diagram'],
      transition: 'Zoom into center concept',
    },
    {
      sceneNumber: 3,
      title: 'Real World Application',
      duration: '90s',
      narration: 'Here is where it gets interesting. This is not just theory — it shows up everywhere in the real world.',
      motionGraphics: 'Split screen or overlay: real world image on left, concept diagram on right. Arrows connect them.',
      voiceDirection: 'Enthusiastic, conversational. Use present tense.',
      onScreen: ['Real example', 'Code or equation if applicable', 'Visual output'],
      transition: 'Slide right',
    },
  ],
  callToAction: 'Click Start Learning to dive deep into this topic with a full interactive lesson.',
  thumbnailSuggestion: 'Dark background, large bold text with gradient, relevant icon or diagram',
}

exports.generateVideoScript = async (topic, category, difficulty = 'Beginner') => {
  const messages = [
    {
      role: 'system',
      content: `You are a world-class educational video director and scriptwriter.
You create video scripts for AI-powered learning platforms.
Style reference: 3Blue1Brown + Kurzgesagt + Apple keynote presentations.
Return ONLY valid JSON.`,
    },
    {
      role: 'user',
      content: `Create a complete video script for: "${topic}" (${category}, ${difficulty})

Return JSON with this EXACT structure:
{
  "title": "Engaging video title",
  "totalDuration": "X minutes",
  "format": "16:9 Cinematic",
  "hook": "One sentence that grabs attention immediately",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene name",
      "duration": "30s",
      "narration": "Word-for-word narration script — 50-120 words. Conversational, memorable.",
      "motionGraphics": "Specific animation description — what appears, how it moves, colors, timing",
      "voiceDirection": "How to read this — tone, pace, emphasis, pauses",
      "onScreen": ["text/graphic element 1", "element 2", "element 3"],
      "transition": "How to transition to next scene"
    }
  ],
  "keyConceptVisuals": [
    { "concept": "Term or idea", "visual": "How to visualize it", "animation": "How it animates" }
  ],
  "callToAction": "What to tell viewers at the end",
  "thumbnailSuggestion": "Thumbnail design description",
  "musicMood": "Background music style recommendation"
}

Requirements:
- 4-6 scenes
- Each narration 50-120 words (conversational, no jargon)
- Motion graphics must be specific and implementable
- Include code visualization for technical topics
- Include equation animation for math topics
- Include experiment visualization for science topics`,
    },
  ]

  const result = await robustAiCall(messages, 'gpt-4o-mini', VIDEO_FALLBACK)

  if (!result.scenes || !Array.isArray(result.scenes)) {
    return VIDEO_FALLBACK
  }

  return result
}
