const Skill = require('../models/Skill');
const CareerProfile = require('../models/CareerProfile');
const Resume = require('../models/Resume');
const Roadmap = require('../models/Roadmap');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Organization = require('../models/Organization');
const { Book } = require('../models/Book');
const MediaItem = require('../models/MediaItem');
const StudyPlan = require('../models/StudyPlan');
const InterviewSession = require('../models/InterviewSession');
const learningEco = require('./learningEcosystemService');
const mediaAccess = require('./mediaAccessService');
const { orgListFilter, orgCreateStamp } = require('../utils/orgScope');

const ROLE_CATALOG = [
  {
    role: 'Backend Engineer',
    industry: 'technology',
    domains: ['technology', 'software'],
    technologies: ['Node.js', 'Python', 'SQL', 'APIs', 'Cloud'],
    skills: ['JavaScript', 'Node.js', 'SQL', 'System Design', 'Git', 'APIs'],
    salary: { currency: 'INR', fresherMin: 400000, fresherMax: 900000, midMin: 1200000, midMax: 2500000 },
    growth: 'high',
  },
  {
    role: 'Frontend Engineer',
    industry: 'technology',
    domains: ['technology', 'software'],
    technologies: ['React', 'TypeScript', 'CSS', 'HTML'],
    skills: ['JavaScript', 'React', 'TypeScript', 'CSS', 'Git', 'UI'],
    salary: { currency: 'INR', fresherMin: 350000, fresherMax: 850000, midMin: 1000000, midMax: 2200000 },
    growth: 'high',
  },
  {
    role: 'Data Analyst',
    industry: 'analytics',
    domains: ['analytics', 'business'],
    technologies: ['SQL', 'Python', 'Excel', 'Tableau'],
    skills: ['SQL', 'Python', 'Statistics', 'Excel', 'Communication'],
    salary: { currency: 'INR', fresherMin: 300000, fresherMax: 700000, midMin: 800000, midMax: 1800000 },
    growth: 'medium',
  },
  {
    role: 'Data Scientist',
    industry: 'analytics',
    domains: ['analytics', 'ai'],
    technologies: ['Python', 'ML', 'SQL', 'TensorFlow'],
    skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Math'],
    salary: { currency: 'INR', fresherMin: 500000, fresherMax: 1200000, midMin: 1500000, midMax: 3500000 },
    growth: 'high',
  },
  {
    role: 'DevOps Engineer',
    industry: 'technology',
    domains: ['technology', 'cloud'],
    technologies: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    skills: ['Linux', 'Docker', 'CI/CD', 'Cloud', 'Scripting'],
    salary: { currency: 'INR', fresherMin: 450000, fresherMax: 1000000, midMin: 1400000, midMax: 3000000 },
    growth: 'high',
  },
  {
    role: 'Full Stack Developer',
    industry: 'technology',
    domains: ['technology', 'software'],
    technologies: ['React', 'Node.js', 'SQL', 'REST'],
    skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'APIs'],
    salary: { currency: 'INR', fresherMin: 400000, fresherMax: 950000, midMin: 1100000, midMax: 2400000 },
    growth: 'high',
  },
  {
    role: 'Product Manager',
    industry: 'product',
    domains: ['product', 'business'],
    technologies: ['Analytics', 'Roadmapping', 'SQL'],
    skills: ['Communication', 'Product Sense', 'Analytics', 'Agile', 'SQL'],
    salary: { currency: 'INR', fresherMin: 600000, fresherMax: 1400000, midMin: 1800000, midMax: 4000000 },
    growth: 'medium',
  },
  {
    role: 'QA Engineer',
    industry: 'technology',
    domains: ['technology', 'quality'],
    technologies: ['Selenium', 'API Testing', 'Jest'],
    skills: ['Testing', 'Automation', 'SQL', 'Communication', 'Git'],
    salary: { currency: 'INR', fresherMin: 300000, fresherMax: 700000, midMin: 900000, midMax: 1800000 },
    growth: 'medium',
  },
  {
    role: 'Cybersecurity Analyst',
    industry: 'security',
    domains: ['security', 'technology'],
    technologies: ['SIEM', 'Networking', 'Python'],
    skills: ['Networking', 'Security', 'Linux', 'Python', 'Risk'],
    salary: { currency: 'INR', fresherMin: 400000, fresherMax: 900000, midMin: 1200000, midMax: 2800000 },
    growth: 'high',
  },
  {
    role: 'Mobile Developer',
    industry: 'technology',
    domains: ['technology', 'mobile'],
    technologies: ['Flutter', 'React Native', 'Kotlin'],
    skills: ['Flutter', 'Dart', 'Mobile UI', 'APIs', 'Git'],
    salary: { currency: 'INR', fresherMin: 350000, fresherMax: 850000, midMin: 1000000, midMax: 2200000 },
    growth: 'medium',
  },
];

const CERT_CATALOG = [
  { name: 'AWS Cloud Practitioner', provider: 'Amazon', skill: 'Cloud', roles: ['Backend Engineer', 'DevOps Engineer'] },
  { name: 'Google Data Analytics', provider: 'Google', skill: 'SQL', roles: ['Data Analyst', 'Data Scientist'] },
  { name: 'Meta Front-End Developer', provider: 'Meta', skill: 'React', roles: ['Frontend Engineer', 'Full Stack Developer'] },
  { name: 'CompTIA Security+', provider: 'CompTIA', skill: 'Security', roles: ['Cybersecurity Analyst'] },
  { name: 'Kubernetes Administrator (CKA)', provider: 'CNCF', skill: 'Kubernetes', roles: ['DevOps Engineer'] },
  { name: 'ISTQB Foundation', provider: 'ISTQB', skill: 'Testing', roles: ['QA Engineer'] },
];

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

function skillMatchScore(userSkills, required) {
  if (!required?.length) return { score: 0, matched: [], missing: [] };
  const map = new Map();
  for (const s of userSkills) {
    map.set(norm(s.name || s), typeof s === 'object' ? Number(s.mastery) || 50 : 70);
  }
  const matched = [];
  const missing = [];
  let pts = 0;
  for (const req of required) {
    const key = norm(req);
    let best = null;
    for (const [name, mastery] of map.entries()) {
      if (name.includes(key) || key.includes(name)) {
        best = { name: req, mastery };
        break;
      }
    }
    if (best) {
      matched.push(best);
      pts += Math.min(100, best.mastery);
    } else {
      missing.push(req);
    }
  }
  const score = Math.round(pts / required.length);
  return { score, matched, missing };
}

async function getOrCreateCareerProfile(user) {
  let profile = await CareerProfile.findOne({ user: user._id });
  if (profile) return profile;
  profile = await CareerProfile.create({
    ...orgCreateStamp(user),
    targetRole: user.targetCareer || '',
    interests: user.targetCareer ? [user.targetCareer] : [],
  });
  return profile;
}

function findRoleEntry(roleName) {
  const key = norm(roleName);
  if (!key) return null;
  return (
    ROLE_CATALOG.find((r) => norm(r.role) === key) ||
    ROLE_CATALOG.find((r) => norm(r.role).includes(key) || key.includes(norm(r.role))) ||
    null
  );
}

async function analyzeSkillGap(user, targetRole) {
  const { skills } = await learningEco.analyzeSkills(user);
  const profile = await getOrCreateCareerProfile(user);
  const role = targetRole || profile.targetRole || user.targetCareer || 'Backend Engineer';
  const entry = findRoleEntry(role) || ROLE_CATALOG[0];
  const { score, matched, missing } = skillMatchScore(skills, entry.skills);
  const current = skills.map((s) => ({
    name: s.name,
    mastery: s.mastery,
    level: s.level,
    category: s.category,
  }));
  const suggestions = missing.slice(0, 8).map((m) => ({
    skill: m,
    action: `Build ${m} to at least 70% mastery via projects and practice`,
    priority: 'high',
  }));
  for (const s of skills.filter((x) => x.mastery < (x.targetMastery || 80)).slice(0, 5)) {
    suggestions.push({
      skill: s.name,
      action: `Close mastery gap: ${s.mastery}% → ${s.targetMastery || 80}%`,
      priority: 'medium',
    });
  }
  return {
    targetRole: entry.role,
    requiredSkills: entry.skills,
    currentSkills: current,
    matched,
    missing,
    gapScore: score,
    readiness: score,
    suggestions: suggestions.slice(0, 12),
  };
}

function recommendCareers(profile, skills) {
  const domains = new Set((profile.preferredDomains || []).map(norm));
  const interests = new Set([...(profile.interests || []), profile.targetRole, ...(profile.preferredRoles || [])].map(norm));
  return ROLE_CATALOG.map((role) => {
    const { score, missing } = skillMatchScore(skills, role.skills);
    let boost = 0;
    if (domains.size && role.domains.some((d) => domains.has(norm(d)))) boost += 12;
    if ([...interests].some((i) => i && (norm(role.role).includes(i) || i.includes(norm(role.role)))))
      boost += 15;
    if ((profile.preferredCompanies || []).length && role.industry === 'technology') boost += 3;
    return {
      role: role.role,
      industry: role.industry,
      domains: role.domains,
      technologies: role.technologies,
      growth: role.growth,
      salary: role.salary,
      matchScore: Math.min(100, score + boost),
      confidence: Math.min(
        95,
        Math.max(25, Math.round((score + boost) * 0.75 + (missing.length ? 0 : 10)))
      ),
      reason:
        missing.length === 0
          ? 'Strong skill overlap'
          : `Close gaps: ${missing.slice(0, 3).join(', ')}`,
      missingSkills: missing,
      opportunities: [
        `${role.growth} growth outlook`,
        `Fresher band ~${role.salary.fresherMin / 100000}-${role.salary.fresherMax / 100000} LPA (${role.salary.currency})`,
      ],
    };
  })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8);
}

function salaryInsights(roleName, level = 'fresher') {
  const entry = findRoleEntry(roleName) || ROLE_CATALOG[0];
  const band =
    level === 'mid' || level === 'senior'
      ? { min: entry.salary.midMin, max: entry.salary.midMax }
      : { min: entry.salary.fresherMin, max: entry.salary.fresherMax };
  return {
    role: entry.role,
    currency: entry.salary.currency,
    level,
    min: band.min,
    max: band.max,
    midpoint: Math.round((band.min + band.max) / 2),
    note: 'Indicative market ranges for guidance; actual offers vary by company and location.',
  };
}

async function matchJobs(user, { limit = 20, internshipOnly = false } = {}) {
  const profile = await getOrCreateCareerProfile(user);
  const { skills } = await learningEco.analyzeSkills(user);
  const filter = { status: 'published' };
  if (internshipOnly) {
    filter.$or = [
      { category: { $regex: /intern/i } },
      { title: { $regex: /intern/i } },
    ];
  }
  const jobs = await Job.find(filter).sort({ publishedAt: -1 }).limit(80).lean();
  const orgIds = [...new Set(jobs.map((j) => String(j.organizationId)))];
  const orgs = await Organization.find({ _id: { $in: orgIds } })
    .select('name slug company.industry company.verificationStatus')
    .lean();
  const orgMap = Object.fromEntries(orgs.map((o) => [String(o._id), o]));

  const preferredCompanies = new Set((profile.preferredCompanies || []).map(norm));
  const scored = jobs.map((job) => {
    const required = job.skills?.length ? job.skills : findRoleEntry(job.title)?.skills || [];
    const { score, matched, missing } = skillMatchScore(skills, required);
    const org = orgMap[String(job.organizationId)];
    let boost = 0;
    if (org && preferredCompanies.has(norm(org.name))) boost += 20;
    if (profile.targetRole && norm(job.title).includes(norm(profile.targetRole))) boost += 10;
    if (profile.preferredDomains?.some((d) => norm(job.category).includes(norm(d)))) boost += 8;
    const eligibility = {
      eligible: required.length > 0 && score + boost >= 40,
      skillScore: score,
      matchedSkills: matched.map((m) => m.name),
      missingSkills: missing,
      experienceOk:
        (job.experienceMinYears || 0) <=
        (profile.experienceLevel === 'senior' ? 6 : profile.experienceLevel === 'mid' ? 3 : 0),
    };
    return {
      job,
      organization: org || null,
      matchScore: Math.min(100, score + boost),
      eligibility,
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

function analyzeResumeHeuristic(resume, targetRole) {
  const entry = findRoleEntry(targetRole) || ROLE_CATALOG[0];
  const skills = resume.skills || [];
  const { score: keywordCoverage, missing } = skillMatchScore(
    skills.map((s) => ({ name: s, mastery: 80 })),
    entry.skills
  );
  let score = 20;
  if (resume.summary && resume.summary.length > 40) score += 15;
  if (resume.headline) score += 8;
  if ((resume.experience || []).length) score += Math.min(20, resume.experience.length * 8);
  if ((resume.education || []).length) score += 10;
  if ((resume.projects || []).length) score += Math.min(15, resume.projects.length * 5);
  if (skills.length) score += Math.min(15, skills.length * 2);
  score = Math.min(100, Math.round(score * 0.55 + keywordCoverage * 0.45));

  const strengths = [];
  const gaps = [];
  const suggestions = [];
  if ((resume.projects || []).length >= 2) strengths.push('Multiple projects demonstrate applied skill');
  if (skills.length >= 5) strengths.push('Solid skill inventory');
  if (!resume.summary || resume.summary.length < 40) {
    gaps.push('Summary is weak or missing');
    suggestions.push('Add a 3–4 sentence professional summary tailored to the target role');
  }
  if (!(resume.experience || []).length) {
    gaps.push('No experience entries');
    suggestions.push('Add internships, campus roles, or freelance work with measurable bullets');
  }
  for (const m of missing.slice(0, 5)) {
    gaps.push(`Missing keyword/skill: ${m}`);
    suggestions.push(`Add evidence of ${m} in skills or projects`);
  }
  if (!(resume.projects || []).length) suggestions.push('Add 1–2 portfolio projects with impact metrics');

  return {
    score,
    analysis: {
      strengths,
      gaps,
      suggestions: suggestions.slice(0, 10),
      keywordCoverage,
      lastAnalyzedAt: new Date(),
    },
  };
}

async function computeAnalytics(user) {
  const profile = await getOrCreateCareerProfile(user);
  const filter = await orgListFilter(user);
  const [{ skills, weaknesses }, roadmaps, plans, resume, applications, interviews, mediaFilter] =
    await Promise.all([
      learningEco.analyzeSkills(user),
      Roadmap.find(filter).select('progress status kind').limit(50).lean(),
      StudyPlan.find(filter).select('schedule progress').limit(50).lean(),
      Resume.findOne({ user: user._id }).sort({ updatedAt: -1 }),
      JobApplication.countDocuments({ applicant: user._id }),
      InterviewSession.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      mediaAccess.accessibleMediaFilter(user),
    ]);

  const skillScore =
    skills.length === 0
      ? 20
      : Math.round(skills.reduce((s, x) => s + (x.mastery || 0), 0) / skills.length);

  const gap = await analyzeSkillGap(user, profile.targetRole || user.targetCareer);
  const careerReadiness = Math.round(gap.readiness * 0.55 + skillScore * 0.45);

  const learningProgress =
    plans.length === 0
      ? Math.round(
          roadmaps.length
            ? roadmaps.reduce((s, r) => s + (r.progress || 0), 0) / roadmaps.length
            : skillScore * 0.5
        )
      : Math.round(
          plans.reduce((acc, p) => {
            if (typeof p.progress === 'number' && p.progress > 0) return acc + p.progress;
            const days = p.schedule || [];
            const done = days.filter((d) => d.completed).length;
            return acc + (days.length ? (done / days.length) * 100 : 0);
          }, 0) / plans.length
        );

  const resumeScore = resume?.score || (resume ? analyzeResumeHeuristic(resume, profile.targetRole).score : 25);

  const interviewScores = interviews
    .map((i) => i.overallScore)
    .filter((n) => typeof n === 'number');
  const interviewReadiness =
    interviewScores.length > 0
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length)
      : Math.min(70, Math.round(careerReadiness * 0.7));

  const certDone = (profile.certifications || []).filter((c) => c.status === 'completed').length;
  const certTotal = Math.max(1, (profile.certifications || []).length);
  const placement = Math.min(
    100,
    Math.round(
      careerReadiness * 0.35 +
        resumeScore * 0.25 +
        interviewReadiness * 0.2 +
        (applications > 0 ? 10 : 0) +
        (certDone / certTotal) * 10
    )
  );

  profile.scores = {
    careerReadiness,
    placement,
    skill: skillScore,
    interviewReadiness,
    resume: resumeScore,
    learningProgress,
    computedAt: new Date(),
  };
  await profile.save();

  return {
    scores: profile.scores,
    skillGap: { missing: gap.missing, readiness: gap.readiness },
    weakSkills: weaknesses.slice(0, 5),
    applications,
    interviewsCompleted: interviews.filter((i) => i.status === 'completed').length,
    roadmapsActive: roadmaps.filter((r) => r.status === 'active').length,
    certificationsCompleted: certDone,
  };
}

async function recommendLearning(user) {
  const { escapeRegex } = require('../utils/helpers');
  const profile = await getOrCreateCareerProfile(user);
  const gap = await analyzeSkillGap(user, profile.targetRole);
  const focus = gap.missing[0] || profile.targetRole || 'programming';
  const focusTerms = [...new Set([focus, ...(gap.missing || []).slice(0, 5)].filter(Boolean))];
  const mediaFilter = await mediaAccess.accessibleMediaFilter(user, { status: 'published' });

  const bookClauses = focusTerms.flatMap((term) => {
    const rx = escapeRegex(String(term).slice(0, 60));
    return [
      { title: { $regex: rx, $options: 'i' } },
      { subject: { $regex: rx, $options: 'i' } },
      { tags: { $regex: rx, $options: 'i' } },
      { category: { $regex: rx, $options: 'i' } },
      { 'topics.name': { $regex: rx, $options: 'i' } },
    ];
  });

  let books = bookClauses.length
    ? await Book.find({ $or: bookClauses }).select('title author category subject tags topics').limit(12).lean()
    : [];
  if (!books.length) {
    books = await Book.find({ scope: 'public' })
      .select('title author category subject tags topics')
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean();
  }

  const [videosRaw, animationsRaw, plans] = await Promise.all([
    MediaItem.find({ ...mediaFilter, type: 'video' })
      .select('title type category topics skills subject')
      .limit(24)
      .lean(),
    MediaItem.find({ ...mediaFilter, type: 'animation' })
      .select('title type category topics skills subject')
      .limit(18)
      .lean(),
    StudyPlan.find({ user: user._id }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  const scoreByFocus = (items) =>
    items
      .map((m) => {
        const hay = `${m.title} ${(m.topics || []).join(' ')} ${(m.skills || []).join(' ')} ${m.category || ''} ${m.subject || ''}`.toLowerCase();
        let hits = 0;
        for (const term of focusTerms) {
          if (hay.includes(String(term).toLowerCase())) hits += 1;
        }
        return {
          ...m,
          score: hits ? Math.min(95, 55 + hits * 12) : 28,
          reason: hits ? `Aligned to skill gap: ${focus}` : 'Catalog pick pending stronger matches',
        };
      })
      .sort((a, b) => b.score - a.score);

  const videos = scoreByFocus(videosRaw).slice(0, 8);
  const animations = scoreByFocus(animationsRaw).slice(0, 6);

  const practiceProblems = gap.missing.slice(0, 6).map((skill) => ({
    skill,
    prompt: `Solve 3 practice problems on ${skill} and write a short reflection`,
    score: 70,
    reason: `Closes gap for ${gap.targetRole}`,
  }));
  const projects = gap.missing.slice(0, 4).map((skill) => ({
    skill,
    idea: `Build a mini-project demonstrating ${skill} aligned to ${gap.targetRole}`,
    score: 72,
    reason: `Portfolio proof for ${gap.targetRole}`,
  }));

  return {
    focus,
    books: books.map((b, i) => ({
      ...b,
      score: Math.max(40, 78 - i * 4),
      reason: `Supports ${focus}`,
    })),
    courses: plans.map((p) => ({ id: p._id, title: p.topic || p.title, horizon: p.horizon })),
    videos,
    animations,
    practiceProblems,
    projects,
  };
}

function recommendCertifications(profile, targetRole, skills = []) {
  const role = targetRole || profile.targetRole || 'Backend Engineer';
  const roleKey = norm(role);
  let matched = CERT_CATALOG.filter((c) =>
    (c.roles || []).some((r) => {
      const rk = norm(r);
      return rk === roleKey || roleKey.includes(rk) || rk.includes(roleKey);
    })
  );
  if (!matched.length) matched = CERT_CATALOG.slice(0, 4);

  const masteryMap = new Map();
  for (const s of skills || []) {
    masteryMap.set(norm(s.name || s.skill || s), Number(s.mastery ?? s.score) || 0);
  }

  return matched
    .map((c) => {
      const key = norm(c.skill);
      let mastery = null;
      for (const [name, value] of masteryMap.entries()) {
        if (name.includes(key) || key.includes(name)) {
          mastery = value;
          break;
        }
      }
      // Prefer certs that close mid/low mastery gaps for the target role.
      let score = 62;
      if (mastery == null) score = 74;
      else if (mastery < 40) score = 82;
      else if (mastery < 70) score = 70;
      else score = 48;
      if ((profile.preferredDomains || []).length) score += 2;
      return {
        name: c.name,
        provider: c.provider,
        skill: c.skill,
        status: 'recommended',
        score: Math.max(35, Math.min(95, score)),
        confidence: Math.max(35, Math.min(90, score - 5)),
        reason:
          mastery == null
            ? `Builds missing ${c.skill} for ${role}`
            : mastery < 70
              ? `Strengthens ${c.skill} (${mastery}% mastery)`
              : `Validates strong ${c.skill} for ${role}`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildRoadmapBlueprint(kind, career, level = 'beginner') {
  const entry = findRoleEntry(career) || ROLE_CATALOG[0];
  const skills = entry.skills.map((name) => ({
    name,
    level: level === 'advanced' ? 'advanced' : 'beginner',
    progress: 0,
  }));

  const blueprints = {
    career: {
      title: `${entry.role} Career Roadmap`,
      timeline: [
        { phase: 1, title: 'Foundations', duration: '4 weeks', topics: entry.skills.slice(0, 3) },
        { phase: 2, title: 'Core skills', duration: '8 weeks', topics: entry.skills.slice(2) },
        { phase: 3, title: 'Projects & portfolio', duration: '6 weeks', topics: ['Projects', 'Git', 'Deploy'] },
        { phase: 4, title: 'Interview prep', duration: '4 weeks', topics: ['DSA', 'System design basics', 'Behavioral'] },
      ],
    },
    skill: {
      title: `${entry.skills[0] || career} Skill Roadmap`,
      timeline: [
        { phase: 1, title: 'Learn basics', duration: '2 weeks', topics: [entry.skills[0] || career] },
        { phase: 2, title: 'Practice', duration: '3 weeks', topics: ['Exercises', 'Quizzes'] },
        { phase: 3, title: 'Apply', duration: '3 weeks', topics: ['Mini project'] },
      ],
    },
    semester: {
      title: `Semester plan toward ${entry.role}`,
      timeline: [
        { phase: 1, title: 'Semester focus A', duration: '1 semester', topics: entry.skills.slice(0, 2) },
        { phase: 2, title: 'Semester focus B', duration: '1 semester', topics: entry.skills.slice(2, 4) },
        { phase: 3, title: 'Capstone', duration: '1 semester', topics: ['Capstone', 'Internships'] },
      ],
    },
    placement: {
      title: `Placement roadmap — ${entry.role}`,
      placementFocus: entry.role,
      timeline: [
        { phase: 1, title: 'Resume & profile', duration: '2 weeks', topics: ['Resume', 'LinkedIn', 'GitHub'] },
        { phase: 2, title: 'Aptitude & DSA', duration: '6 weeks', topics: ['Aptitude', 'DSA', 'Mock tests'] },
        { phase: 3, title: 'Company prep', duration: '4 weeks', topics: entry.technologies.slice(0, 3) },
        { phase: 4, title: 'Applications', duration: '4 weeks', topics: ['Applications', 'Referrals', 'Interviews'] },
      ],
    },
    certification: {
      title: `Certification plan — ${entry.role}`,
      timeline: [
        { phase: 1, title: 'Pick cert', duration: '1 week', topics: ['Choose certification'] },
        { phase: 2, title: 'Study', duration: '6 weeks', topics: entry.technologies.slice(0, 2) },
        { phase: 3, title: 'Exam', duration: '2 weeks', topics: ['Practice tests', 'Exam'] },
      ],
    },
  };

  const bp = blueprints[kind] || blueprints.career;
  return {
    title: bp.title,
    career: entry.role,
    description: `Intelligent ${kind} roadmap for ${entry.role}`,
    kind,
    semesterLabel: kind === 'semester' ? 'current' : '',
    placementFocus: bp.placementFocus || '',
    skills,
    timeline: bp.timeline.map((t) => ({ ...t, completed: false })),
    progress: 0,
    status: 'active',
  };
}

function fallbackInterviewQuestions(role, type = 'mixed') {
  const technical = [
    { prompt: `Explain a core concept required for ${role}.`, category: 'technical', difficulty: 'medium' },
    { prompt: `Walk through how you would design a simple system related to ${role}.`, category: 'technical', difficulty: 'hard' },
    { prompt: `Describe a bug you debugged and how you fixed it.`, category: 'technical', difficulty: 'medium' },
    { prompt: `What tools and technologies do you use daily for ${role}?`, category: 'technical', difficulty: 'easy' },
  ];
  const hr = [
    { prompt: 'Tell me about yourself.', category: 'hr', difficulty: 'easy' },
    { prompt: 'Why do you want this role?', category: 'hr', difficulty: 'easy' },
    { prompt: 'Describe a conflict on a team and how you resolved it.', category: 'behavioral', difficulty: 'medium' },
    { prompt: 'Where do you see yourself in 3 years?', category: 'hr', difficulty: 'easy' },
  ];
  if (type === 'technical') return technical;
  if (type === 'hr') return hr;
  return [...technical.slice(0, 3), ...hr.slice(0, 3)];
}

module.exports = {
  ROLE_CATALOG,
  CERT_CATALOG,
  getOrCreateCareerProfile,
  analyzeSkillGap,
  recommendCareers,
  salaryInsights,
  matchJobs,
  analyzeResumeHeuristic,
  computeAnalytics,
  recommendLearning,
  recommendCertifications,
  buildRoadmapBlueprint,
  fallbackInterviewQuestions,
  findRoleEntry,
  skillMatchScore,
};
