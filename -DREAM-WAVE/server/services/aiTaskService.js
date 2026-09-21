const { robustAiCall } = require("./openaiService");

const FALLBACK_TASKS = {
  days: [
    {
      day: 1, title: "Foundation — Understanding the Core", focus: "Deep conceptual learning",
      tasks: [
        {
          type: "learn",
          title: "Master the Fundamentals: Why This Skill Matters",
          description: "Today's learning session is entirely dedicated to building a rock-solid conceptual foundation. Before writing a single line of code or practicing any technique, you need to understand WHY this skill exists, WHAT problems it solves, and HOW industry professionals use it daily.\n\nStart by reading the official documentation or the first chapter of the recommended textbook. Pay attention to the history of this technology — understanding WHY it was created helps you understand when to use it and when not to. Take detailed notes using the Cornell Method: write key concepts on the left, your explanation in your own words on the right, and a summary at the bottom.\n\nSpend at least 45 minutes watching a high-quality introductory video (Fireship, Traversy Media, or the official documentation tutorial). Pause every 10 minutes and write down what you understood in your own words without looking at the screen.\n\nEnd this session by writing 3 sentences: (1) What is this skill? (2) What problem does it solve? (3) How do companies use it? If you cannot write those 3 sentences clearly, you need to review again before moving on.",
          estimatedTime: "2 hours",
          completed: false
        }
      ]
    },
    {
      day: 2, title: "Active Recall — Test What You Know", focus: "Memory consolidation through testing",
      tasks: [
        {
          type: "quiz",
          title: "Self-Assessment: Can You Explain This Without Notes?",
          description: "Open a blank document. Without looking at your notes, answer these questions:\n\n1. Explain this concept as if teaching a 10-year-old.\n2. What are 3 real-world applications?\n3. What are the 5 most important things you learned yesterday?\n4. What confused you? Write your confusion clearly.\n5. Fill-in-the-blank: '_________ is used when _________ because _________'\n\nAfter answering, check your notes. Mark what was wrong or missing in red. These are your weak points — they need extra attention in Day 4 revision.\n\nDifficulty tip: If you got more than 70% correct, you are ready. If below 70%, spend 30 extra minutes reviewing before Day 3 practice.",
          estimatedTime: "1 hour",
          completed: false
        }
      ]
    },
    {
      day: 3, title: "Hands-On Practice — Build Something Real", focus: "Applied skill development",
      tasks: [
        {
          type: "practice",
          title: "Build a Mini Project Using Today's Concept",
          description: "Theory without practice is useless in this field. Today you build something real.\n\nTask: Create a small but complete mini-project that applies exactly what you learned in Day 1. This should take 1.5-2 hours of focused work. The project does not need to be impressive — it needs to be FUNCTIONAL and WORKING.\n\nRequirements:\n- It must run without errors\n- It must demonstrate at least 3 concepts from Day 1\n- Push it to GitHub with a clear README explaining what it does\n- Test it with at least 2 different inputs/scenarios\n\nIf you get stuck, use the 15-minute rule: try to solve it yourself for 15 minutes before looking up the answer. Document what you struggled with — these are your learning gold mines.",
          estimatedTime: "2 hours",
          completed: false
        }
      ]
    },
    {
      day: 4, title: "Reinforcement — Strengthen Weak Areas", focus: "Targeted revision",
      tasks: [
        {
          type: "revise",
          title: "Review, Reinforce, and Connect",
          description: "Look at the red marks from Day 2 quiz. These are your weak areas — spend 60% of today's session on them.\n\nRevision method: Use active recall, NOT passive re-reading. Cover your notes and try to recall. For each weak area:\n1. Read it once slowly\n2. Close the book\n3. Explain it aloud or write it from memory\n4. Compare with original\n5. Repeat until you get it right\n\nAlso: Connect today's skill to things you already know. Draw a mind map showing relationships between concepts. This 'connective learning' dramatically improves long-term retention.\n\nEnd by writing a 5-sentence summary of everything you've learned in the past 4 days. This summary will serve as your quick-reference guide.",
          estimatedTime: "1.5 hours",
          completed: false
        }
      ]
    },
    {
      day: 5, title: "Skill Validation + Next Skill Preview", focus: "Competency verification",
      tasks: [
        {
          type: "quiz",
          title: "Final Assessment: Are You Ready to Move Forward?",
          description: "Before moving to the next skill, validate your competency.\n\nValidation checklist:\n✅ Can I explain this concept clearly without notes?\n✅ Can I identify when to use this vs alternatives?\n✅ Can I build a working example from scratch?\n✅ Can I debug a broken version of this concept?\n✅ Do I know 3 real companies that use this?\n\nScore yourself honestly:\n- 5/5: Excellent — move to next skill confidently\n- 4/5: Good — spend 30 min on weak area, then move on\n- 3/5: Adequate — revisit Day 3 practice before moving\n- Below 3: Restart Days 1-4 with a different resource\n\nThen spend 15 minutes previewing the NEXT skill in your roadmap. This preview primes your brain to notice relevant patterns and information over the next 24 hours.",
          estimatedTime: "1.5 hours",
          completed: false
        }
      ]
    }
  ]
};

/**
 * Generates a structured 25-30 day learning execution plan.
 * Each task contains 200-400 word detailed instructions.
 *
 * @param {string} goalTitle
 * @param {string} category
 * @param {Object} roadmap
 * @returns {Promise<Object>}
 */
exports.generateDailyTasks = async (goalTitle, category, roadmap) => {
  const steps = roadmap?.nextSteps || roadmap?.phases || roadmap?.timeline || [];
  const skills = roadmap?.skills || [];

  const skillNames = Array.isArray(skills)
    ? skills.slice(0, 8).map(s => (typeof s === 'string' ? s : s.name || '')).filter(Boolean).join(', ')
    : '';

  const stepsContext = Array.isArray(steps)
    ? steps.slice(0, 6).map((s, i) => `Step ${i+1}: ${s.title || s.focus || ''}`).join('\n')
    : '';

  const prompt = `You are a world-class learning architect designing a premium 25-30 day skill execution plan.

GOAL: "${goalTitle}" | CATEGORY: ${category}
SKILLS TO MASTER: ${skillNames || 'Core fundamentals'}
ROADMAP CONTEXT:
${stepsContext}

MANDATORY LEARNING CYCLE — repeat for each skill:
Day 1 → type: "learn"    → Deep conceptual explanation (NOT shallow)
Day 2 → type: "quiz"     → Active recall questions and self-testing
Day 3 → type: "practice" → Real hands-on project/exercise
Day 4 → type: "revise"   → Targeted reinforcement of weak areas
Day 5 → type: "learn"    → Next skill (cycle repeats)

CONTENT DEPTH REQUIREMENT — THIS IS CRITICAL:
Every task description MUST be 200-400 words.
Include in EVERY description:
- Exactly what the student should do, step by step
- Why this activity matters for their career
- Specific resources (tool name, website, book title)
- Common mistakes to avoid
- What success looks like for this session
- Connection to real industry usage

PROHIBITED:
- Short 2-3 sentence descriptions
- Generic advice like "study this topic"
- Vague instructions like "practice coding"
- Any description under 150 words

RETURN ONLY valid JSON:
{
  "days": [
    {
      "day": 1,
      "title": "Specific concept/topic title",
      "focus": "One sentence describing today's learning objective",
      "tasks": [
        {
          "type": "learn",
          "title": "Specific, actionable task title",
          "description": "200-400 word detailed instructions covering: what to do step by step, why it matters, which specific resources to use (name them), mistakes to avoid, what success looks like, industry context.",
          "estimatedTime": "1.5-2 hours",
          "completed": false
        }
      ]
    }
  ]
}

Requirements: 25-30 days, 2-3 tasks per day, max 2 hours total per day. Each task description MINIMUM 150 words.`;

  const messages = [
    { role: "system", content: "You are an elite learning architect. Return ONLY valid JSON. Every description must be 150-400 words. NO SHORT DESCRIPTIONS." },
    { role: "user", content: prompt }
  ];

  const result = await robustAiCall(messages, "gpt-4o-mini", FALLBACK_TASKS);

  if (!result.days || !Array.isArray(result.days) || result.days.length === 0) {
    console.warn("[aiTaskService] Invalid structure, using fallback.");
    return FALLBACK_TASKS;
  }

  // Sanitize and enforce minimum description length
  result.days = result.days.map((day, i) => ({
    day:   day.day || i + 1,
    title: day.title || `Day ${i + 1}`,
    focus: day.focus || '',
    tasks: Array.isArray(day.tasks) ? day.tasks.map(t => ({
      type:          ['learn','quiz','practice','revise'].includes(t.type) ? t.type : 'learn',
      title:         t.title || 'Learning Session',
      description:   t.description || 'Complete this task with full focus.',
      estimatedTime: t.estimatedTime || '1.5 hours',
      completed:     false,
    })) : [],
  })).filter(d => d.tasks.length > 0);

  return result;
};
