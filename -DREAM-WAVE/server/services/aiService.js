const crypto = require('crypto');
const { withRetry, withTimeout } = require('../utils/retry');
const { getOpenAI, getApiKey } = require('../utils/openaiClient');

const AI_MODES = {
  mentor: {
    label: 'AI Mentor',
    category: 'coaching',
    system: 'You are Dream Wave AI Mentor. Coach careers, learning, and habits with actionable markdown advice.',
  },
  teacher: {
    label: 'AI Teacher',
    category: 'learning',
    system:
      'You are Dream Wave AI Teacher. Explain concepts step-by-step like a patient instructor, use examples, check understanding with questions, and adapt difficulty.',
  },
  study: {
    label: 'AI Study Assistant',
    category: 'learning',
    system:
      'You are Dream Wave AI Study Assistant. Design realistic study plans with daily blocks, spaced repetition, and measurable outcomes. Prefer concrete schedules.',
  },
  career: {
    label: 'AI Career Guide',
    category: 'career',
    system: 'You are an expert career guide. Help with role selection, transitions, salary bands, and positioning.',
  },
  roadmap: {
    label: 'AI Roadmap Generator',
    category: 'career',
    system:
      'You generate structured learning roadmaps with phases, skills, and timelines. Prefer clear numbered steps.',
  },
  interview: {
    label: 'AI Interview Coach',
    category: 'career',
    system:
      'You run mock interviews, score answers, and coach STAR responses for behavioral and technical rounds.',
  },
  resume: {
    label: 'AI Resume Assistant',
    category: 'career',
    system:
      'You write strong resume bullets, summaries, and ATS-friendly phrasing tailored to target roles.',
  },
  books: {
    label: 'AI Book Assistant',
    category: 'knowledge',
    system:
      'You explain books and chapters, extract key concepts, recommend reading order, and create study aids from book content.',
  },
  research: {
    label: 'AI Research Assistant',
    category: 'knowledge',
    system: 'You research topics rigorously, cite reasoning, compare sources, and produce structured briefs.',
  },
  pdf: {
    label: 'AI PDF Analyzer',
    category: 'knowledge',
    system: 'You analyze document text: summarize, extract key points, explain hard parts, and answer questions.',
  },
  notes: {
    label: 'AI Notes Generator',
    category: 'learning',
    system: 'You turn content into clean study notes with headings, bullets, and memory cues.',
  },
  quiz: {
    label: 'AI Quiz Generator',
    category: 'learning',
    system:
      'You create quizzes. When asked for JSON, return valid JSON with questions[{question,options,answer,explanation}].',
  },
  coding: {
    label: 'AI Coding Assistant',
    category: 'engineering',
    system: 'You are a senior engineer. Explain code, debug, and write clean examples with markdown code fences.',
  },
  daily: {
    label: 'AI Daily Planner',
    category: 'productivity',
    system: 'You build focused daily plans with time blocks, priorities, and energy management.',
  },
  goals: {
    label: 'AI Goal Advisor',
    category: 'productivity',
    system: 'You break goals into milestones, metrics, and weekly commitments.',
  },
  habits: {
    label: 'AI Habit Tracker Coach',
    category: 'productivity',
    system: 'You design habit systems, streaks, and cue-routine-reward loops.',
  },
  motivation: {
    label: 'AI Motivation Coach',
    category: 'coaching',
    system: 'You motivate with empathy and concrete next actions — never empty pep talks.',
  },
  project: {
    label: 'AI Project Advisor',
    category: 'engineering',
    system: 'You scope projects, suggest architectures, milestones, and portfolio framing.',
  },
  community: {
    label: 'AI Community Assistant',
    category: 'collaboration',
    system:
      'You help moderate and energize learning communities: summarize threads, suggest topics, and recommend collaborators.',
  },
  time: {
    label: 'AI Time Management Assistant',
    category: 'productivity',
    system: 'You optimize calendars, deep work, and priority matrices (Eisenhower / MIT).',
  },
};

/** Allowed chat models (selection is constrained for security). */
const AI_MODELS = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    default: true,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    default: false,
  },
  {
    id: 'fallback',
    label: 'Offline Fallback',
    provider: 'local',
    default: false,
  },
];

const MODE_ALIASES = {
  'study-assistant': 'study',
  studyAssistant: 'study',
  'resume-assistant': 'resume',
  resumeAssistant: 'resume',
  'book-assistant': 'books',
  bookAssistant: 'books',
  'career-guide': 'career',
  'interview-coach': 'interview',
  'roadmap-generator': 'roadmap',
  chat: 'mentor',
};

function normalizeMode(mode) {
  const raw = String(mode || 'mentor').trim();
  const aliased = MODE_ALIASES[raw] || raw;
  return AI_MODES[aliased] ? aliased : null;
}

function resolveModel(requested) {
  const fallback = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const id = String(requested || fallback).trim();
  if (id === 'fallback') return { id: 'fallback', useApi: false };
  const allowed = AI_MODELS.some((m) => m.id === id && m.provider === 'openai');
  if (!allowed) return { id: fallback, useApi: true };
  return { id, useApi: true };
}

function trimHistory(messages = [], maxMessages = 12, maxChars = 24000) {
  const sliced = messages.slice(-Math.max(2, maxMessages));
  let total = sliced.reduce((n, m) => n + String(m.content || '').length, 0);
  if (total <= maxChars) return sliced;
  const out = [];
  let used = 0;
  for (let i = sliced.length - 1; i >= 0; i--) {
    const content = String(sliced[i].content || '');
    if (used + content.length > maxChars && out.length >= 2) break;
    out.unshift({ role: sliced[i].role, content });
    used += content.length;
  }
  return out;
}

function buildContextBlock(parts = []) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 12000);
}

let OpenAI = null;
try {
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}

/** Short-TTL in-memory response cache for identical non-streaming prompts. */
const RESPONSE_CACHE = new Map();
const RESPONSE_CACHE_TTL_MS = Math.max(15_000, Number(process.env.AI_CACHE_TTL_MS) || 90_000);
const RESPONSE_CACHE_MAX = 200;

function cacheKey(modeId, history, system, model) {
  const turns = (history || [])
    .slice(-8)
    .map((m) => `${m.role}:${String(m.content || '').slice(0, 400)}`)
    .join('||');
  const payload = `${modeId}|${model || ''}|${system.slice(0, 400)}|${turns}|${(history || []).length}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function cacheGet(key) {
  const hit = RESPONSE_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (RESPONSE_CACHE.size >= RESPONSE_CACHE_MAX) {
    const oldest = RESPONSE_CACHE.keys().next().value;
    if (oldest) RESPONSE_CACHE.delete(oldest);
  }
  RESPONSE_CACHE.set(key, { value, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
}

function modeFallback(mode, userMessage) {
  const label = AI_MODES[mode]?.label || 'Dream Wave AI';
  const q = (userMessage || '').slice(0, 400);
  const templates = {
    quiz: `## Quiz: ${q || 'Topic'}\n\n1. What is the core idea?\n   A) Option A  B) Option B  C) Option C  D) Option D\n   **Answer:** B — start with fundamentals, then apply.\n\n2. Which practice builds mastery fastest?\n   A) Passive reading  B) Spaced active recall  C) Skipping reviews  D) Multitasking\n   **Answer:** B\n\n3. What should you ship this week?\n   A) A tiny project  B) Nothing  C) Only notes  D) Only videos\n   **Answer:** A`,
    notes: `## Notes\n\n### Overview\n${q || 'Topic'} — capture the essence in one sentence.\n\n### Key points\n- Definition\n- Why it matters\n- Common pitfalls\n- Practice drill\n\n### Memory cue\nTeach it to someone in 60 seconds.`,
    resume: `## Resume upgrade\n\n**Summary**\nResults-driven professional building toward ${q || 'your target role'} with measurable impact.\n\n**Bullet formula**\n- Action + scope + metric + outcome\n\n**Example**\n- Built a learning tracker used daily; improved completion rate by 30% in 6 weeks.`,
    interview: `## Mock interview\n\n**Question:** Tell me about a challenging project.\n\n**STAR coach**\n- Situation → Task → Action → Result\n- Quantify impact\n- End with what you learned\n\nReply with your answer and I'll score it.`,
    coding: `## Coding assist\n\n\`\`\`js\n// Start with a clear function and tests\nfunction solve(input) {\n  // 1) validate\n  // 2) transform\n  // 3) return\n  return input;\n}\n\`\`\`\n\nShare your language + problem for a tailored solution.`,
    daily: `## Today's plan\n\n1. **MIT (Most Important Task)** — 90 min deep work\n2. **Learning block** — 45 min skill practice\n3. **Admin** — 30 min messages/tasks\n4. **Review** — 15 min reflection\n\nProtect the MIT before noon.`,
    habits: `## Habit design\n\n- Cue: same time/place\n- Routine: 2-minute starter version\n- Reward: log streak + small treat\n\nTrack in Habit Tracker and aim for consistency over intensity.`,
    books: `## Book picks\n\n1. *Atomic Habits* — systems\n2. *Deep Work* — focus\n3. *So Good They Can't Ignore You* — career capital\n4. Domain book matched to: ${q || 'your goal'}\n\nRead 20 pages/day and log progress in Books.`,
    mentor: `## Mentor guidance\n\nFor **${q || 'your goal'}**, use this 7-day loop:\n\n1. Define one measurable outcome\n2. Pick the weakest skill blocking it\n3. Schedule two 45-min practice blocks\n4. Ship one tiny artifact (notes, PR, demo)\n5. Review what worked tomorrow morning\n\nAsk for a roadmap, accountability plan, or skill drill next.`,
    teacher: `## Teaching breakdown\n\n**Topic:** ${q || 'Concept'}\n\n1. Intuition in one sentence\n2. Concrete example\n3. Common misconception\n4. Mini check question\n5. Practice drill (10–15 min)\n\nReply with your current level and I'll adjust difficulty.`,
    study: `## Study plan\n\nFocus: **${q || 'your topic'}**\n\n- Day 1–2: Foundations + examples\n- Day 3–4: Active recall + spaced review\n- Day 5: Mini project / problem set\n- Day 6: Teach-back notes\n- Day 7: Timed quiz + gap list\n\nKeep sessions ≤ 50 minutes with a written exit ticket.`,
    career: `## Career guidance\n\nTarget: **${q || 'your role'}**\n\n1. Map required skills vs current mastery\n2. Close the top 2 gaps with projects\n3. Update resume bullets with metrics\n4. Run 3 mock interviews this week\n5. Apply to 5 well-matched roles\n\nAsk for a role comparison or skill-gap plan.`,
    roadmap: `## Learning roadmap\n\nGoal: **${q || 'skill / role'}**\n\n- Phase 1 (2–4 wks): Foundations\n- Phase 2 (4–8 wks): Core skills + weekly projects\n- Phase 3 (3–6 wks): Portfolio polish\n- Phase 4 (2–4 wks): Interview / assessment prep\n\nShare your level and timeline for a customized phase plan.`,
    research: `## Research brief\n\nQuery: **${q || 'topic'}**\n\n1. Frame the question precisely\n2. List 3–5 source types to check\n3. Extract claims vs evidence\n4. Note disagreements / open questions\n5. Write a one-page synthesis + next reads\n\nPaste notes or a PDF excerpt for a deeper analysis.`,
    community: `## Community assist\n\nTheme: **${q || 'discussion'}**\n\n- Summarize the thread in 3 bullets\n- Suggest a clarifying question\n- Propose a collaborative next step\n- Recommend related tags / peers\n\nShare the post text for a tailored reply draft.`,
  };
  if (templates[mode]) return templates[mode];
  return `## ${label}\n\nThanks — here's a focused response for: **${q || 'your request'}**\n\n1. Clarify the outcome for the next 7 days\n2. Break it into 3 concrete actions\n3. Schedule the first action today\n4. Review progress tomorrow\n\nAsk a follow-up for a deeper plan, checklist, or examples.`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Light prompt-injection filter for user-authored text (keeps system prompts isolated). */
function sanitizeUserText(text, maxLen = 8000) {
  if (typeof text !== 'string') return '';
  let sanitized = text.trim().slice(0, maxLen);
  const patterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/gi,
    /system\s*prompt\s*:/gi,
    /<\s*\/?\s*system\s*>/gi,
    /\bdo\s+not\s+follow\s+(your\s+)?(system|developer)\s+(prompt|instructions)\b/gi,
  ];
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return sanitized;
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => {
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    const content =
      role === 'user' ? sanitizeUserText(m?.content) : sanitizeUserText(String(m?.content || ''), 12000);
    return { role, content };
  });
}

async function chatCompletion(messages, systemPrompt, options = {}) {
  const resolved = resolveModel(options.model);
  const last = messages.filter((m) => m.role === 'user').at(-1)?.content || '';
  const modeKey =
    options.mode ||
    Object.keys(AI_MODES).find((k) => systemPrompt.includes(AI_MODES[k].label)) ||
    'mentor';

  if (!resolved.useApi || !getApiKey()) {
    return {
      content: modeFallback(modeKey, last),
      model: 'fallback',
      provider: 'local',
    };
  }

  const client = getOpenAI();
  const payload = {
    model: resolved.id,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1600,
  };

  const maxAttempts = Math.max(1, options.retries ?? 2);
  let lastErr = null;
  try {
    const result = await withRetry(
      async (attempt) => {
        try {
          const res = await withTimeout(
            () => client.chat.completions.create(payload),
            Number(process.env.OPENAI_TIMEOUT_MS) || 45000,
            'openai_chat'
          );
          return {
            content: res.choices[0]?.message?.content || modeFallback(modeKey, last),
            model: resolved.id,
            provider: 'openai',
          };
        } catch (err) {
          lastErr = err;
          console.warn(`OpenAI error (attempt ${attempt + 1}/${maxAttempts}):`, err.message);
          throw err;
        }
      },
      { retries: maxAttempts - 1, baseDelayMs: 200 }
    );
    return result;
  } catch {
    /* fall through to local fallback */
  }

  return {
    content: modeFallback(modeKey, last),
    model: 'fallback',
    provider: 'local',
    recovered: true,
    error: lastErr?.message || 'openai_failed',
  };
}

async function runMode(mode, messages, extraContext = '', options = {}) {
  const modeId = normalizeMode(mode) || 'mentor';
  const cfg = AI_MODES[modeId] || AI_MODES.mentor;
  const context = buildContextBlock([sanitizeUserText(extraContext, 12000), options.contextSummary]);
  const system = context ? `${cfg.system}\n\nContext:\n${context}` : cfg.system;
  const history = trimHistory(sanitizeMessages(messages), options.maxMessages, options.maxChars);
  const resolved = resolveModel(options.model);
  const key = cacheKey(modeId, history, system, resolved.id);
  if (!options.skipCache) {
    const cached = cacheGet(key);
    if (cached) {
      return { ...cached, cached: true, mode: modeId, modeLabel: cfg.label };
    }
  }
  const result = await chatCompletion(history, system, { ...options, mode: modeId });
  const out = {
    ...result,
    mode: modeId,
    modeLabel: cfg.label,
  };
  if (!options.skipCache && result?.content) {
    cacheSet(key, { content: result.content, model: result.model, provider: result.provider, recovered: result.recovered });
  }
  return out;
}

/**
 * Stream tokens via onChunk(text). Falls back to a single chunk when API unavailable.
 */
async function streamMode(mode, messages, extraContext = '', options = {}, onChunk) {
  const modeId = normalizeMode(mode) || 'mentor';
  const cfg = AI_MODES[modeId] || AI_MODES.mentor;
  const context = buildContextBlock([sanitizeUserText(extraContext, 12000), options.contextSummary]);
  const system = context ? `${cfg.system}\n\nContext:\n${context}` : cfg.system;
  const history = trimHistory(sanitizeMessages(messages), options.maxMessages, options.maxChars);
  const resolved = resolveModel(options.model);
  const last = history.filter((m) => m.role === 'user').at(-1)?.content || '';

  if (!resolved.useApi || !getApiKey()) {
    const content = modeFallback(modeId, last);
    if (typeof onChunk === 'function') onChunk(content);
    return { content, model: 'fallback', provider: 'local', mode: modeId, streamed: false };
  }

  try {
    const client = getOpenAI();
    const stream = await client.chat.completions.create({
      model: resolved.id,
      messages: [{ role: 'system', content: system }, ...history],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1600,
      stream: true,
    });
    let content = '';
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content || '';
      if (delta) {
        content += delta;
        if (typeof onChunk === 'function') onChunk(delta);
      }
    }
    if (!content) {
      content = modeFallback(modeId, last);
      if (typeof onChunk === 'function') onChunk(content);
    }
    return { content, model: resolved.id, provider: 'openai', mode: modeId, streamed: true };
  } catch (err) {
    console.warn('OpenAI stream error, recovering:', err.message);
    const content = modeFallback(modeId, last);
    if (typeof onChunk === 'function') onChunk(content);
    return {
      content,
      model: 'fallback',
      provider: 'local',
      mode: modeId,
      streamed: false,
      recovered: true,
      error: err.message,
    };
  }
}

function listModes() {
  return Object.entries(AI_MODES).map(([id, m]) => ({
    id,
    label: m.label,
    category: m.category || 'general',
    description: m.system.slice(0, 160),
  }));
}

function listModels() {
  const configured = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return AI_MODELS.map((m) => ({
    ...m,
    default: m.id === configured || (m.default && !AI_MODELS.some((x) => x.id === configured)),
    available: m.provider === 'local' || Boolean(getApiKey()),
  }));
}

const ASSISTANT_ROUTES = {
  mentor: 'mentor',
  teacher: 'teacher',
  study: 'study',
  'study-assistant': 'study',
  career: 'career',
  'career-guide': 'career',
  roadmap: 'roadmap',
  'roadmap-generator': 'roadmap',
  interview: 'interview',
  'interview-coach': 'interview',
  resume: 'resume',
  'resume-assistant': 'resume',
  books: 'books',
  'book-assistant': 'books',
  chat: 'mentor',
};

function fallbackRoadmap(career) {
  const c = career || 'Software Engineer';
  return {
    title: `${c} Learning Roadmap`,
    career: c,
    description: `A practical path to grow toward ${c}.`,
    skills: [
      { name: 'Fundamentals', level: 'beginner', progress: 0 },
      { name: 'Tools & Workflow', level: 'beginner', progress: 0 },
      { name: 'Projects', level: 'intermediate', progress: 0 },
      { name: 'Communication', level: 'beginner', progress: 0 },
      { name: 'Interview Prep', level: 'beginner', progress: 0 },
    ],
    timeline: [
      { phase: 1, title: 'Foundations', duration: '4 weeks', topics: ['Core concepts', 'Daily practice', 'Notes system'], completed: false },
      { phase: 2, title: 'Applied Skills', duration: '6 weeks', topics: ['Tooling', 'Mini projects', 'Code review habits'], completed: false },
      { phase: 3, title: 'Portfolio', duration: '6 weeks', topics: ['Capstone project', 'Documentation', 'Demo video'], completed: false },
      { phase: 4, title: 'Career Ready', duration: '4 weeks', topics: ['Resume', 'Mock interviews', 'Networking'], completed: false },
    ],
  };
}

async function generateRoadmap(career, level = 'beginner') {
  const key = process.env.OPENAI_API_KEY;
  if (key && OpenAI) {
    try {
      const client = new OpenAI({ apiKey: key });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Return ONLY valid JSON with keys: title, career, description, skills (array of {name,level,progress}), timeline (array of {phase,title,duration,topics,completed}).',
          },
          { role: 'user', content: `Create a learning roadmap for becoming a ${career}. Current level: ${level}.` },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content);
    } catch (err) {
      console.warn('Roadmap AI fallback:', err.message);
    }
  }
  return fallbackRoadmap(career);
}

function fallbackReport(userName, stats) {
  return {
    title: 'Performance Report',
    sections: [
      {
        title: 'Executive Summary',
        content: `${userName} is building consistent momentum across goals, learning, and productivity.`,
      },
      {
        title: 'Progress Snapshot',
        content: `Goals active: ${stats.goalsActive || 0}\nTasks completed: ${stats.tasksDone || 0}\nRoadmap progress: ${stats.roadmapProgress || 0}%\nLearning streak: ${stats.learningStreak || stats.streak || 0}\nSkills tracked: ${stats.skillsCount || 0}\nHabits active: ${stats.habitsActive || 0}`,
      },
      {
        title: 'AI Insights',
        content:
          'Prioritize one skill gap this week, protect a daily deep-work block, and convert one roadmap phase into tasks.',
      },
      {
        title: 'Recommendations',
        content:
          '1. Complete one study-plan day.\n2. Log habits for streak continuity.\n3. Run a quiz on a weak topic.\n4. Ship a small portfolio artifact.',
      },
    ],
  };
}

async function generateReportSections(userName, stats) {
  const key = process.env.OPENAI_API_KEY;
  if (key && OpenAI) {
    try {
      const client = new OpenAI({ apiKey: key });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Return ONLY JSON: { title, sections: [{ title, content }] } for a student progress report.',
          },
          { role: 'user', content: `Write a progress report for ${userName}. Stats: ${JSON.stringify(stats)}` },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content);
    } catch (err) {
      console.warn('Report AI fallback:', err.message);
    }
  }
  return fallbackReport(userName, stats);
}

async function generateStudyPlan(topic, days = 14) {
  const key = process.env.OPENAI_API_KEY;
  if (key && OpenAI) {
    try {
      const client = new OpenAI({ apiKey: key });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Return ONLY JSON: { title, topic, durationDays, goals: string[], schedule: [{day,focus,tasks:string[],completed:false}] }',
          },
          { role: 'user', content: `Create a ${days}-day study plan for: ${topic}` },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content);
    } catch (err) {
      console.warn('Study plan fallback:', err.message);
    }
  }
  const schedule = Array.from({ length: Math.min(days, 14) }, (_, i) => ({
    day: i + 1,
    focus: i % 3 === 0 ? 'Theory' : i % 3 === 1 ? 'Practice' : 'Review',
    tasks: [`Study ${topic} — block ${i + 1}`, 'Take notes', 'Do 1 practice drill'],
    completed: false,
  }));
  return {
    title: `${topic} Study Plan`,
    topic,
    durationDays: days,
    goals: [`Understand ${topic} fundamentals`, 'Build practice reps', 'Pass a self-quiz'],
    schedule,
  };
}

async function generateQuiz(topic, context = '') {
  const key = process.env.OPENAI_API_KEY;
  if (key && OpenAI) {
    try {
      const client = new OpenAI({ apiKey: key });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Return ONLY JSON: { title, questions: [{ question, options: string[4], answer, explanation }] } with 5 questions.',
          },
          {
            role: 'user',
            content: `Create a quiz on ${topic}. Context:\n${context.slice(0, 8000)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content);
    } catch (err) {
      console.warn('Quiz fallback:', err.message);
    }
  }
  return {
    title: `${topic} Quiz`,
    questions: [
      {
        question: `What is a foundational concept in ${topic}?`,
        options: ['Core definition', 'Random trivia', 'Unrelated tool', 'Skipping practice'],
        answer: 'Core definition',
        explanation: 'Start from definitions before advanced tactics.',
      },
      {
        question: 'Best way to retain learning?',
        options: ['Cram once', 'Spaced recall', 'Only watch videos', 'Avoid testing'],
        answer: 'Spaced recall',
        explanation: 'Active recall with spacing beats passive review.',
      },
      {
        question: 'What should you produce weekly?',
        options: ['A small artifact', 'Nothing', 'Only bookmarks', 'Endless notes'],
        answer: 'A small artifact',
        explanation: 'Output creates proof of skill.',
      },
      {
        question: 'How do you find skill gaps?',
        options: ['Guess', 'Quiz + project feedback', 'Ignore errors', 'Skip reviews'],
        answer: 'Quiz + project feedback',
        explanation: 'Measurement reveals gaps.',
      },
      {
        question: 'Ideal daily study block?',
        options: ['5 hours unfocused', '45–90 focused minutes', 'Zero', 'All-nighter'],
        answer: '45–90 focused minutes',
        explanation: 'Consistency beats burnout.',
      },
    ],
  };
}

async function suggestActions(stats) {
  return [
    stats.tasksOverdue > 0
      ? `Clear ${stats.tasksOverdue} overdue task(s) before starting new work.`
      : 'No overdue tasks — keep the streak going.',
    stats.skillsCount
      ? 'Practice your lowest-mastery skill for 25 minutes (Pomodoro).'
      : 'Add skills on the Learning dashboard to unlock gap analysis.',
    'Upload a PDF/DOCX in Documents and generate notes + a quiz.',
    'Open AI Studio → Daily Planner and lock your MIT for today.',
  ];
}

module.exports = {
  AI_MODES,
  AI_MODELS,
  MODE_ALIASES,
  ASSISTANT_ROUTES,
  normalizeMode,
  resolveModel,
  trimHistory,
  buildContextBlock,
  sanitizeUserText,
  sanitizeMessages,
  listModes,
  listModels,
  chatCompletion,
  runMode,
  streamMode,
  generateRoadmap,
  generateReportSections,
  generateStudyPlan,
  generateQuiz,
  suggestActions,
  fallbackRoadmap,
};
