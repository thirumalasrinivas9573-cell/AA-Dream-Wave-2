const safeJsonParse = require("../utils/safeJsonParse");
const { getOpenAI } = require("../utils/openaiClient");
const client = new Proxy({}, { get(_t, p) { return getOpenAI()[p]; } });

// ── Retry-based robust AI call ─────────────────────────────────────────────────
const robustAiCall = async (messages, model = "gpt-4o-mini", fallback = {}) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model, messages, temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 4096,
      });
      const parsed = safeJsonParse(res.choices[0].message.content, null);
      if (parsed) return parsed;
      console.warn(`[robustAiCall] Attempt ${attempt} JSON parse failed.`);
    } catch (err) {
      console.error(`[robustAiCall] Attempt ${attempt}: ${err.message}`);
      if (err?.status === 429) break;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1200));
    }
  }
  return fallback;
};

// ── Standard chat ──────────────────────────────────────────────────────────────
const chat = async (messages, userGoal = "") => {
  const sys = `You are Sage, an elite AI mentor, career coach, teacher, research guide and productivity expert inside Dream Wave AI.

CORE IDENTITY:
- You are NOT a chatbot. You are a premium consultant, mentor, teacher and researcher.
- You give detailed, structured, research-quality responses.
- Every response must feel like it came from a world-class expert.

CONTENT STANDARDS:
- When someone asks a serious question (career, learning, goals), respond with 600-1000+ words.
- Never give generic 5-line answers to important questions.
- Use real industry data, statistics, examples, and actionable plans.
- Structure every response clearly with sections, steps, and examples.

USER GOAL CONTEXT: "${userGoal || 'Not specified'}"

RESPONSE RULES:
1. Always start with a direct, honest assessment
2. Provide structured guidance (not bullet dump — real paragraphs)
3. Include real examples, case studies, or data where relevant
4. End with a concrete next action the user can take TODAY
5. Never say "Here are some tips" — instead provide expert analysis

DEPTH GUIDE:
- Simple question (motivation, short query): 150-300 words
- Career question: 600-1000 words minimum
- Learning question: 600-1000 words with roadmap
- Goal setting: 500-800 words with clear plan
- Research topic: 800+ words with data and examples`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: sys }, ...messages],
    temperature: 0.72,
    max_tokens: 2048,
  });
  return { reply: res.choices[0].message.content, explain: null };
};

// ── Deep R&D Career Report — 2000-5000 words ─────────────────────────────────
const generateRDReport = async (goal) => {
  const FALLBACK = {
    careerOverview:  `${goal} is a dynamic and growing career path with significant opportunities in 2024-2025.`,
    demand:          "Market demand is high with 15-20% annual growth projected through 2030.",
    skills:          "Core technical and soft skills are essential, including domain knowledge, problem-solving, and communication.",
    learningPath:    "Begin with foundational courses (3-6 months), build hands-on projects (6-12 months), then target entry-level roles.",
    tools:           "Industry-standard tools and platforms are widely used. Proficiency in key tools is mandatory.",
    salary:          "Entry: ₹3-8 LPA | Mid: ₹8-18 LPA | Senior: ₹18-45 LPA | Global: $60k-$140k+",
    growth:          "Strong upward trajectory with clear paths to senior, lead, and management roles within 5-8 years.",
    risks:           "Automation threats exist in some areas. Continuous upskilling is essential to remain relevant.",
    opportunities:   "Freelancing, remote work, consulting, and entrepreneurship are all viable parallel tracks.",
    caseStudies:     "Thousands of professionals have transitioned into this career within 12-18 months with focused effort.",
    comparison:      "Compared to alternatives, this field offers strong compensation, job security, and growth potential.",
    finalDecision:   "Highly recommended for motivated individuals willing to invest 12-18 months in structured learning.",
  };

  const messages = [
    {
      role: "system",
      content: `You are a world-class career research analyst, industry expert, and senior consultant with 25+ years of experience across career counseling, industry research, and talent development.

YOUR MANDATE: Generate a PROFESSIONAL RESEARCH INTELLIGENCE REPORT — not a summary. This must be publishable as a premium consulting document.

CONTENT STANDARDS:
- Every section must contain 150-400 words minimum
- Include real statistics, salary ranges in INR and USD, company names, technology stacks
- Include India-specific and global perspectives
- Provide actionable, specific recommendations — not generic advice
- Use actual industry data from 2023-2025

PROHIBITED: Do NOT write short paragraphs. Do NOT give generic advice. Do NOT say "it depends." Give specific, data-backed answers.

RETURN ONLY valid JSON. No markdown. No code blocks.`,
    },
    {
      role: "user",
      content: `Generate a comprehensive professional R&D Career Intelligence Report for: "${goal}"

This report will be used by students and professionals making major career decisions. It must be thorough, accurate, and genuinely useful.

Return JSON with ALL these fields. Each field must be a detailed string of 150-400+ words:

{
  "careerOverview": "Comprehensive overview: what this career actually involves day-to-day in 2024-2025. Include what professionals in this role do every morning when they sit down. What problems they solve. What impact they create. Who they work with. What the field looked like 5 years ago vs today. What makes this career intellectually stimulating or challenging. Include specific sub-roles within this career (e.g., for Software Engineer: Frontend, Backend, Full Stack, DevOps, etc.). Minimum 250 words.",

  "demand": "Deep market analysis: Current hiring trends with specific numbers where possible (e.g., 'LinkedIn shows 2.5 lakh open positions in India'). Which cities have the most demand (Bangalore, Hyderabad, Pune, etc.). Which industries are hiring most (fintech, health tech, edtech, etc.). How COVID changed this industry. What has happened in 2023-2024 (layoffs, hiring boom, etc.). Growth projections for 2025-2030. Include both India and global perspective. Minimum 200 words.",

  "skills": "Complete skill breakdown: List ALL technical skills required with brief explanation of each (not just names). Explain WHY each skill matters and at what career stage it becomes critical. Include: programming languages/tools, frameworks, methodologies, soft skills, domain knowledge. Separate beginner skills from advanced skills. What skills are becoming obsolete vs emerging. What skills differentiate average from excellent professionals. Minimum 250 words.",

  "learningPath": "Detailed week-by-week or month-by-month learning roadmap for a complete beginner: Month 1-2 (what to study, specific resources), Month 3-4 (intermediate topics, first projects), Month 5-6 (advanced topics, portfolio), Month 7-9 (specialization, job hunting), Month 10-12 (first job preparation). Include specific course names on Coursera, Udemy, YouTube channels, books. What to avoid wasting time on. How to measure progress. Common mistakes beginners make. Minimum 300 words.",

  "tools": "Comprehensive tools analysis: List every major tool, platform, software, and technology used in this career. For each tool explain: what it does, why it matters, how long it takes to learn, whether it is free or paid, its market share. Include: primary tools (must-know), secondary tools (good to know), emerging tools (future-proof). Which tools employers actually test in interviews. Minimum 200 words.",

  "salary": "Detailed salary intelligence for India (2024-2025): Entry level (0-2 years): city-wise ranges. Mid level (2-5 years): what drives salary jumps. Senior (5-10 years): leadership premium. Principal/Staff level (10+ years): top of market. Comparison between product companies vs service companies vs startups. Which companies pay the most (FAANG, unicorns, MNCs vs Indian companies). How to negotiate salary. What certifications or skills give 30-50% salary boosts. Global comparison (US, UK, Europe, Singapore, Dubai). Minimum 250 words.",

  "growth": "Career growth trajectory analysis: What does a 10-year career arc look like in this field. What titles/roles exist at each stage. What skills unlock promotions. How to move from individual contributor to manager vs technical leader (Staff/Principal paths). Success stories of people who built exceptional careers. What separates the top 10% earners from the rest. Adjacent career paths (e.g., developer to product manager, engineer to CTO). When to switch companies for maximum growth. Minimum 200 words.",

  "risks": "Honest risk assessment: Which tasks in this role are being automated by AI and by when. Which sub-specializations are becoming obsolete. What happened during 2022-2023 tech layoffs and lessons learned. Physical/mental health risks (burnout, sedentary work, etc.). How to future-proof this career. What skills are recession-proof. Geopolitical risks (visa issues, outsourcing trends). Market saturation analysis — is this field becoming overcrowded. Minimum 200 words.",

  "opportunities": "Comprehensive opportunity mapping: Freelance opportunities and average freelance rates. Remote work possibilities and which countries/companies hire remotely. Consulting opportunities after 5+ years. Business/startup opportunities (what products/services can be built). Open source contribution value. Content creation (YouTube, blog, courses) as income source. Teaching and coaching opportunities. Which side hustles are realistic for this profession. How to build passive income. Minimum 200 words.",

  "caseStudies": "3-4 realistic career journey stories: Story 1 — College graduate with no experience who became successful in 18 months (what exactly they did). Story 2 — Career changer from unrelated field (what worked). Story 3 — Professional who hit a plateau and broke through (specific strategies). Include failures, setbacks, and how they were overcome. What decisions made the biggest difference. These should be detailed, realistic, and inspiring — not vague success stories. Minimum 250 words.",

  "comparison": "Deep comparison with 3 alternative careers: For each alternative (e.g., if goal is Web Developer, compare with Data Scientist, DevOps Engineer, Product Manager): Same skills? Different? Salary comparison at each level. Job market size comparison. Day-to-day work differences. Which one to choose based on personality type, risk tolerance, interest in math vs creativity vs people management. Which career is better for freelancing. Which has better work-life balance. Be honest — if a related career is objectively better for certain people, say so. Minimum 250 words.",

  "finalDecision": "Expert verdict and personalized roadmap: After analyzing everything, give a clear recommendation. Who should definitely pursue this career (personality traits, interests, strengths). Who might struggle (be honest). What is the minimum viable investment of time and money to test this career before fully committing. What the first 30 days should look like for someone starting today. 3 things to do this week. 3 red flags that this career is wrong for you. 3 signs you are on the right track. What success looks like in 1 year, 3 years, and 5 years. Minimum 250 words."
}`,
    },
  ];

  return await robustAiCall(messages, "gpt-4o-mini", FALLBACK);
};

module.exports = { robustAiCall, chat, generateRDReport };
