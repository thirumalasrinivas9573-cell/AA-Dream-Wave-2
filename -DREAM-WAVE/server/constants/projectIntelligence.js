/**
 * Lasya V5 Prompt 6 — AI Project Builder + Portfolio Intelligence + Skill-to-Project Engine
 */

const PROJECT_STATUSES = ['IDEA', 'PLANNING', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'PUBLISHED', 'ARCHIVED']

const PROJECT_TYPES = [
  'LEARNING_PROJECT',
  'PORTFOLIO_PROJECT',
  'CAPSTONE',
  'RESEARCH_PROJECT',
  'TEAM_PROJECT',
  'PERSONAL_PROJECT',
  'COMPETITION_PROJECT',
]

const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

const HEALTH_STATUSES = ['ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']

const EVIDENCE_STRENGTH = ['PLANNED', 'IN_PROGRESS', 'DEMONSTRATED', 'VERIFIED']

const EVIDENCE_TYPES = [
  'MILESTONE',
  'TEST',
  'REPOSITORY',
  'DEPLOYMENT',
  'DOCUMENTATION',
  'DEMO',
  'SCREENSHOT',
  'ARTIFACT',
]

const MILESTONE_DEFAULTS = [
  'Requirements',
  'Design',
  'Architecture',
  'Backend',
  'Frontend',
  'Integration',
  'Testing',
  'Deployment',
  'Documentation',
]

const PROJECT_TEMPLATES = {
  AI: {
    title: 'RAG Research Assistant',
    problem: 'Help users query authorized documents with evidence-grounded answers',
    skills: ['Python', 'APIs', 'LLM integration', 'Vector search'],
    technologies: ['Python', 'FastAPI', 'OpenAI API', 'MongoDB'],
    difficulty: 'INTERMEDIATE',
  },
  WEB: {
    title: 'Production REST API',
    problem: 'Build a secure REST API with auth, validation, and tests',
    skills: ['REST APIs', 'Authentication', 'Database', 'Testing'],
    technologies: ['Node.js', 'Express', 'MongoDB', 'JWT'],
    difficulty: 'INTERMEDIATE',
  },
  DATA: {
    title: 'Data Analysis Dashboard',
    problem: 'Analyze and visualize structured datasets with clear insights',
    skills: ['Python', 'Data wrangling', 'Statistics', 'Visualization'],
    technologies: ['Python', 'Pandas', 'Matplotlib'],
    difficulty: 'BEGINNER',
  },
}

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /expose\s+private/i,
  /execute\s+(shell|command|script)/i,
  /modify\s+(permissions|system)/i,
]

module.exports = {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  DIFFICULTY_LEVELS,
  HEALTH_STATUSES,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPES,
  MILESTONE_DEFAULTS,
  PROJECT_TEMPLATES,
  INJECTION_PATTERNS,
}
