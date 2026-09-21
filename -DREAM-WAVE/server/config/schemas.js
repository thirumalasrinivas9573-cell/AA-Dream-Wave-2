const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number');

const schemas = {
  signup: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: passwordSchema,
    inviteToken: z.string().min(16).max(128).optional(),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    portal: z.enum(['student', 'institution', 'company']).optional(),
  }),
  otpVerify: z.object({
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  forgotPassword: z.object({ email: z.string().email() }),
  resetPassword: z.object({ password: passwordSchema }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
  goal: z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    status: z.enum(['active', 'completed', 'paused']).optional(),
    progress: z.number().min(0).max(100).optional(),
    targetDate: z.string().datetime().or(z.string().min(1)).optional().nullable(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    milestones: z
      .array(
        z.object({
          title: z.string().min(1),
          completed: z.boolean().optional(),
          dueDate: z.string().optional().nullable(),
        })
      )
      .optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  goalUpdate: z
    .object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().max(2000).optional(),
      category: z.string().max(80).optional(),
      status: z.enum(['active', 'completed', 'paused']).optional(),
      progress: z.number().min(0).max(100).optional(),
      targetDate: z.string().optional().nullable(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      milestones: z.array(z.any()).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      aiRecommended: z.boolean().optional(),
      aiSuggestion: z.string().max(2000).optional(),
    })
    .strict(),
  task: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
    dueDate: z.string().optional().nullable(),
    scheduledAt: z.string().optional().nullable(),
    estimatedMinutes: z.coerce.number().min(0).max(1440).optional(),
    goal: z.string().optional().nullable(),
    dependsOn: z.array(z.string()).max(20).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
    recurrence: z
      .object({
        enabled: z.boolean().optional(),
        frequency: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
        interval: z.coerce.number().min(1).max(30).optional(),
        nextOccurrence: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      })
      .optional(),
  }),
  taskUpdate: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
      dueDate: z.string().optional().nullable(),
      scheduledAt: z.string().optional().nullable(),
      estimatedMinutes: z.coerce.number().min(0).max(1440).optional(),
      loggedMinutes: z.coerce.number().min(0).optional(),
      goal: z.string().optional().nullable(),
      dependsOn: z.array(z.string()).max(20).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      progress: z.coerce.number().min(0).max(100).optional(),
      recurrence: z
        .object({
          enabled: z.boolean().optional(),
          frequency: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
          interval: z.coerce.number().min(1).max(30).optional(),
          nextOccurrence: z.string().optional().nullable(),
          endDate: z.string().optional().nullable(),
        })
        .optional(),
    })
    .strict(),
  roadmapGenerate: z.object({
    career: z.string().min(2).max(120),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
  contact: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    message: z.string().min(10).max(2000),
  }),
  communityPost: z.object({
    content: z.string().min(1).max(2000),
  }),
  comment: z.object({
    text: z.string().min(1).max(500),
  }),
  settingsUpdate: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.string().max(10).optional(),
      notifications: z.boolean().optional(),
      emailUpdates: z.boolean().optional(),
      name: z.string().min(2).max(80).optional(),
      bio: z.string().max(500).optional(),
      targetCareer: z.string().max(120).optional(),
    })
    .strict(),
  deleteAccount: z.object({
    password: z.string().min(1),
  }),
  paginationQuery: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .passthrough(),
  updateProfile: z
    .object({
      name: z.string().min(2).max(80).optional(),
      bio: z.string().max(500).optional(),
      targetCareer: z.string().max(120).optional(),
    })
    .passthrough(),
  bookUpload: z
    .object({
      title: z.string().min(1).max(200).optional(),
      author: z.string().max(120).optional(),
      category: z.string().max(80).optional(),
      subject: z.string().max(120).optional(),
      description: z.string().max(4000).optional(),
      scope: z.enum(['public', 'personal', 'institution', 'company']).optional(),
    })
    .passthrough(),
  searchQuery: z
    .object({
      q: z.string().min(1).max(120).optional(),
      limit: z.coerce.number().int().min(1).max(30).optional(),
      types: z.string().max(200).optional(),
    })
    .passthrough(),
  opsDaysQuery: z
    .object({
      days: z.coerce.number().int().min(1).max(90).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      action: z.string().max(80).optional(),
      severity: z.string().max(40).optional(),
    })
    .passthrough(),
  billingCheckout: z.object({
    plan: z.enum(['pro', 'team']),
  }),
  mediaCreateMeta: z
    .object({
      title: z.string().min(1).max(240).optional(),
      description: z.string().max(5000).optional(),
      type: z.enum(['animation', 'video', 'audio']).optional(),
      category: z.string().max(80).optional(),
      subject: z.string().max(120).optional(),
      grade: z.string().max(40).optional(),
      topics: z.union([z.array(z.string().max(120)).max(30), z.string().max(2000)]).optional(),
      tags: z.union([z.array(z.string().max(40)).max(20), z.string().max(800)]).optional(),
      scope: z.enum(['public', 'personal', 'institution', 'company']).optional(),
      publish: z.union([z.boolean(), z.string()]).optional(),
      allowDownload: z.union([z.boolean(), z.string()]).optional(),
      durationSec: z.coerce.number().min(0).optional(),
      book: z.string().optional().nullable(),
      chapterId: z.string().max(64).optional(),
      course: z.string().optional().nullable(),
    })
    .passthrough(),
  adminUserUpdate: z
    .object({
      role: z.enum(['user', 'admin']).optional(),
      plan: z.enum(['free', 'pro', 'team']).optional(),
      isActive: z.boolean().optional(),
      credits: z.number().int().min(0).max(100000).optional(),
    })
    .strict(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(10).optional(),
    notifications: z.boolean().optional(),
    emailUpdates: z.boolean().optional(),
    focusMinutes: z.number().min(5).max(120).optional(),
  }),
  goalProgress: z.object({
    progress: z.number().min(0).max(100),
  }),
  habit: z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    frequency: z.enum(['daily', 'weekly']).optional(),
    targetPerWeek: z.number().int().min(1).max(14).optional(),
    color: z.string().max(40).optional(),
  }),
  habitUpdate: z
    .object({
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(1000).optional(),
      frequency: z.enum(['daily', 'weekly']).optional(),
      targetPerWeek: z.number().int().min(1).max(14).optional(),
      color: z.string().max(40).optional(),
      active: z.boolean().optional(),
    })
    .strict(),
  plannerEvent: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z
      .enum([
        'task',
        'study',
        'meeting',
        'focus',
        'habit',
        'assignment',
        'interview',
        'reminder',
        'other',
      ])
      .optional(),
    start: z.string().min(1),
    end: z.string().optional().nullable(),
    allDay: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    relatedTask: z.string().optional().nullable(),
    relatedGoal: z.string().optional().nullable(),
    reminderAt: z.string().optional().nullable(),
  }),
  plannerEventUpdate: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      type: z
        .enum([
          'task',
          'study',
          'meeting',
          'focus',
          'habit',
          'assignment',
          'interview',
          'reminder',
          'other',
        ])
        .optional(),
      start: z.string().optional(),
      end: z.string().optional().nullable(),
      allDay: z.boolean().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      completed: z.boolean().optional(),
      relatedTask: z.string().optional().nullable(),
      relatedGoal: z.string().optional().nullable(),
      reminderAt: z.string().optional().nullable(),
    })
    .strict(),
  skill: z.object({
    name: z.string().min(1).max(120),
    category: z.string().max(80).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    mastery: z.number().min(0).max(100).optional(),
    targetMastery: z.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional(),
  }),
  studyPlan: z.object({
    topic: z.string().min(2).max(200),
    days: z.number().int().min(3).max(90).optional(),
  }),
  studyPlanHorizon: z.object({
    topic: z.string().min(2).max(200),
    horizon: z.enum(['daily', 'weekly', 'monthly']),
  }),
  learningAssess: z.object({
    answers: z.array(z.string().max(200)).max(20).optional(),
    selfRatings: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          mastery: z.number().min(0).max(100),
        })
      )
      .max(20)
      .optional(),
  }),
  learningContent: z.object({
    topic: z.string().min(1).max(200),
    detail: z.string().max(12000).optional(),
    count: z.number().int().min(1).max(20).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
  quizCreate: z.object({
    topic: z.string().min(2).max(200),
    context: z.string().max(8000).optional(),
  }),
  quizSubmit: z.object({
    answers: z.array(z.string().max(500)).max(50),
  }),
  resumeUpdate: z
    .object({
      title: z.string().min(1).max(120).optional(),
      headline: z.string().max(200).optional(),
      summary: z.string().max(5000).optional(),
      experience: z.array(z.any()).optional(),
      education: z.array(z.any()).optional(),
      skills: z.array(z.string().max(80)).max(80).optional(),
      projects: z.array(z.any()).optional(),
    })
    .strict(),
  resumeImprove: z.object({
    targetRole: z.string().min(2).max(120).optional(),
    applySummary: z.boolean().optional(),
  }),
  reportGenerate: z.object({
    title: z.string().min(2).max(200).optional(),
    career: z.string().max(120).optional(),
    type: z.string().max(40).optional(),
  }),
  bookProgress: z.object({
    readingProgress: z.number().min(0).max(100).optional(),
    status: z.enum(['want', 'reading', 'done']).optional(),
    currentChapter: z.number().int().min(0).optional(),
  }),
  booksRecommend: z.object({
    focus: z.string().max(200).optional(),
  }),
  bookCreate: z.object({
    title: z.string().min(1).max(240),
    author: z.string().min(1).max(160),
    category: z.string().max(80).optional(),
    subject: z.string().max(120).optional(),
    publisher: z.string().max(160).optional(),
    isbn: z.string().max(32).optional(),
    version: z.string().max(40).optional(),
    description: z.string().max(5000).optional(),
    coverUrl: z.string().max(300).optional(),
    pages: z.number().int().min(0).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    scope: z.enum(['public', 'personal', 'institution', 'company']).optional(),
    relatedBooks: z.array(z.string()).max(20).optional(),
  }),
  bookUpdate: z
    .object({
      title: z.string().min(1).max(240).optional(),
      author: z.string().min(1).max(160).optional(),
      category: z.string().max(80).optional(),
      subject: z.string().max(120).optional(),
      publisher: z.string().max(160).optional(),
      isbn: z.string().max(32).optional(),
      version: z.string().max(40).optional(),
      description: z.string().max(5000).optional(),
      coverUrl: z.string().max(300).optional(),
      pages: z.number().int().min(0).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      relatedBooks: z.array(z.string()).max(20).optional(),
      chapters: z.array(z.any()).max(80).optional(),
      topics: z.array(z.any()).max(80).optional(),
    })
    .strict(),
  bookHighlight: z.object({
    text: z.string().min(1).max(2000),
    chapterId: z.string().optional().nullable(),
    color: z.string().max(20).optional(),
    page: z.number().int().min(0).optional(),
    note: z.string().max(1000).optional(),
  }),
  bookNote: z.object({
    body: z.string().min(1).max(4000),
    chapterId: z.string().optional().nullable(),
    page: z.number().int().min(0).optional(),
  }),
  bookAiQuestion: z.object({
    question: z.string().max(1000).optional(),
    chapterId: z.string().optional().nullable(),
  }),
  bookChapter: z.object({
    title: z.string().min(1).max(200).optional(),
    order: z.number().int().min(1).optional(),
    startPage: z.number().int().min(0).optional(),
    endPage: z.number().int().min(0).optional(),
    content: z.string().max(50000).optional(),
    summary: z.string().max(5000).optional(),
    keyConcepts: z.array(z.string().max(200)).max(30).optional(),
  }),
  bookTopics: z.object({
    topics: z
      .array(
        z.union([
          z.string().max(120),
          z.object({ name: z.string().max(120), chapterOrder: z.number().optional() }),
        ])
      )
      .max(80),
  }),
  bookRelated: z.object({
    relatedBooks: z.array(z.string()).max(20),
  }),
  documentAnalyze: z.object({
    action: z.enum(['summarize', 'explain', 'notes', 'keypoints', 'ask']).optional(),
    question: z.string().max(1000).optional(),
  }),
  aiRun: z.object({
    mode: z.string().min(1).max(40).optional(),
    message: z.string().min(1).max(8000),
    conversationId: z.string().optional().nullable(),
    context: z.string().max(12000).optional(),
    model: z.string().max(80).optional(),
    promptId: z.string().optional().nullable(),
  }),
  aiQuick: z.object({
    mode: z.string().min(1).max(40).optional(),
    prompt: z.string().min(1).max(8000),
    context: z.string().max(12000).optional(),
    model: z.string().max(80).optional(),
  }),
  aiStream: z.object({
    mode: z.string().min(1).max(40).optional(),
    message: z.string().min(1).max(8000),
    conversationId: z.string().optional().nullable(),
    context: z.string().max(12000).optional(),
    model: z.string().max(80).optional(),
  }),
  aiPromptCreate: z.object({
    name: z.string().min(1).max(120),
    body: z.string().min(1).max(8000),
    mode: z.string().min(1).max(40).optional(),
    description: z.string().max(400).optional(),
    isFavorite: z.boolean().optional(),
  }),
  aiPromptUpdate: z.object({
    name: z.string().min(1).max(120).optional(),
    body: z.string().min(1).max(8000).optional(),
    mode: z.string().min(1).max(40).optional(),
    description: z.string().max(400).optional(),
    isFavorite: z.boolean().optional(),
  }),
  mentorCreate: z.object({
    title: z.string().max(120).optional(),
    mode: z.string().min(1).max(40).optional(),
    model: z.string().max(80).optional(),
    contextSummary: z.string().max(4000).optional(),
  }),
  mentorUpdate: z.object({
    title: z.string().min(1).max(120).optional(),
    pinned: z.boolean().optional(),
    mode: z.string().min(1).max(40).optional(),
    model: z.string().max(80).optional(),
    contextSummary: z.string().max(4000).optional(),
  }),
  mentorMessage: z.object({
    content: z.string().max(8000).optional(),
    message: z.string().max(8000).optional(),
    mode: z.string().min(1).max(40).optional(),
    model: z.string().max(80).optional(),
  }),
  mediaUpdate: z
    .object({
      title: z.string().min(1).max(240).optional(),
      description: z.string().max(5000).optional(),
      type: z.enum(['animation', 'video', 'audio']).optional(),
      category: z.string().max(80).optional(),
      subject: z.string().max(120).optional(),
      grade: z.string().max(40).optional(),
      topics: z.union([z.array(z.string().max(120)).max(30), z.string().max(2000)]).optional(),
      tags: z.union([z.array(z.string().max(40)).max(20), z.string().max(800)]).optional(),
      language: z.string().max(16).optional(),
      durationSec: z.coerce.number().min(0).optional(),
      allowDownload: z.union([z.boolean(), z.string()]).optional(),
      book: z.string().optional().nullable(),
      chapterId: z.string().max(64).optional(),
      course: z.string().optional().nullable(),
      thumbnailUrl: z.string().max(500).optional(),
      scope: z.enum(['public', 'personal', 'institution', 'company']).optional(),
      quizTrigger: z
        .object({
          enabled: z.boolean().optional(),
          quizId: z.string().optional().nullable(),
          prompt: z.string().max(500).optional(),
        })
        .optional(),
    })
    .passthrough(),
  mediaProgress: z.object({
    positionSec: z.coerce.number().min(0).optional(),
    durationSec: z.coerce.number().min(0).optional(),
    deltaWatchSec: z.coerce.number().min(0).optional(),
    percent: z.coerce.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
  }),
  mediaRecommend: z.object({
    focus: z.string().max(200).optional(),
  }),
  roadmapUpdate: z
    .object({
      title: z.string().min(2).max(200).optional(),
      career: z.string().max(120).optional(),
      description: z.string().max(5000).optional(),
      skills: z.array(z.any()).optional(),
      timeline: z.array(z.any()).optional(),
      progress: z.number().min(0).max(100).optional(),
      status: z.enum(['active', 'completed', 'archived']).optional(),
      kind: z.enum(['career', 'skill', 'semester', 'placement', 'certification']).optional(),
      semesterLabel: z.string().max(40).optional(),
      placementFocus: z.string().max(160).optional(),
    })
    .strict(),
  roadmapSkillUpdate: z.object({
    progress: z.number().min(0).max(100).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
  researchProjectCreate: z.object({
    title: z.string().min(1).max(240),
    description: z.string().max(5000).optional(),
    category: z
      .enum([
        'general',
        'academic',
        'literature',
        'science',
        'technology',
        'business',
        'legal',
        'medical',
        'other',
      ])
      .optional(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    folderPath: z.string().max(240).optional(),
  }),
  researchProjectUpdate: z.object({
    title: z.string().min(1).max(240).optional(),
    description: z.string().max(5000).optional(),
    category: z
      .enum([
        'general',
        'academic',
        'literature',
        'science',
        'technology',
        'business',
        'legal',
        'medical',
        'other',
      ])
      .optional(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    folderPath: z.string().max(240).optional(),
  }),
  researchAttachDocument: z.object({
    documentId: z.string().min(1),
  }),
  researchReadingProgress: z.object({
    percent: z.coerce.number().min(0).max(100).optional(),
    lastPosition: z.coerce.number().min(0).optional(),
  }),
  researchAi: z.object({
    chapterId: z.string().max(64).optional(),
    topic: z.string().max(200).optional(),
    style: z.string().max(40).optional(),
  }),
  researchSearch: z.object({
    q: z.string().max(200).optional(),
    type: z.enum(['all', 'project', 'document', 'keyword', 'semantic', 'topic', 'note']).optional(),
    projectId: z.string().optional(),
    tag: z.string().max(40).optional(),
    topic: z.string().max(120).optional(),
    status: z.string().max(40).optional(),
    category: z.string().max(40).optional(),
  }),
  researchNote: z.object({
    title: z.string().min(1).max(240),
    body: z.string().max(50000).optional(),
    documentId: z.string().optional().nullable(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    folderPath: z.string().max(240).optional(),
    collectionId: z.string().optional().nullable(),
  }),
  researchNoteUpdate: z.object({
    title: z.string().min(1).max(240).optional(),
    body: z.string().max(50000).optional(),
    documentId: z.string().optional().nullable(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    folderPath: z.string().max(240).optional(),
    collectionId: z.string().optional().nullable(),
  }),
  researchHighlight: z.object({
    documentId: z.string().min(1),
    text: z.string().min(1).max(5000),
    color: z.string().max(32).optional(),
    startOffset: z.coerce.number().min(0).optional(),
    endOffset: z.coerce.number().min(0).optional(),
    note: z.string().max(2000).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  researchBookmark: z.object({
    label: z.string().min(1).max(200),
    documentId: z.string().optional().nullable(),
    position: z.coerce.number().min(0).optional(),
    folderPath: z.string().max(240).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  researchCollection: z.object({
    name: z.string().min(1).max(160),
    description: z.string().max(2000).optional(),
    folderPath: z.string().max(240).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    documentIds: z.array(z.string()).max(100).optional(),
  }),
  researchCollectionUpdate: z.object({
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).optional(),
    folderPath: z.string().max(240).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    documentIds: z.array(z.string()).max(100).optional(),
  }),
  careerProfileUpdate: z.object({
    headline: z.string().max(200).optional(),
    summary: z.string().max(4000).optional(),
    interests: z.array(z.string().max(80)).max(30).optional(),
    preferredDomains: z.array(z.string().max(80)).max(20).optional(),
    preferredCompanies: z.array(z.string().max(120)).max(30).optional(),
    preferredRoles: z.array(z.string().max(120)).max(20).optional(),
    targetRole: z.string().max(160).optional(),
    targetIndustry: z.string().max(120).optional(),
    experienceLevel: z.enum(['student', 'fresher', 'junior', 'mid', 'senior']).optional(),
    academic: z
      .object({
        degree: z.string().max(160).optional(),
        major: z.string().max(160).optional(),
        institution: z.string().max(200).optional(),
        graduationYear: z.coerce.number().min(1950).max(2100).optional().nullable(),
        cgpa: z.coerce.number().min(0).max(10).optional().nullable(),
        semester: z.string().max(40).optional(),
      })
      .optional(),
    syncUserCareer: z.boolean().optional(),
  }),
  careerRoleQuery: z.object({
    role: z.string().max(160).optional(),
  }),
  careerRoadmapGenerate: z.object({
    career: z.string().min(2).max(120).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    kind: z.enum(['career', 'skill', 'semester', 'placement', 'certification']).optional(),
    semesterLabel: z.string().max(40).optional(),
    placementFocus: z.string().max(160).optional(),
    useAi: z.boolean().optional(),
  }),
  careerInterviewQuestions: z.object({
    role: z.string().max(160).optional(),
    type: z.enum(['technical', 'hr', 'mixed', 'mock']).optional(),
    useAi: z.boolean().optional(),
  }),
  careerInterviewSession: z.object({
    role: z.string().max(160).optional(),
    company: z.string().max(160).optional(),
    type: z.enum(['technical', 'hr', 'mixed', 'mock']).optional(),
    questions: z
      .array(
        z.union([
          z.string().max(2000),
          z.object({
            prompt: z.string().max(2000),
            category: z.enum(['technical', 'hr', 'behavioral']).optional(),
            difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
            sampleAnswer: z.string().max(4000).optional(),
          }),
        ])
      )
      .max(20)
      .optional(),
  }),
  careerInterviewAnswer: z.object({
    answer: z.string().min(1).max(8000),
  }),
  careerResumeAnalyze: z.object({
    targetRole: z.string().max(160).optional(),
    useAi: z.boolean().optional(),
  }),
  careerResumeOptimize: z.object({
    targetRole: z.string().max(160).optional(),
    applySummary: z.boolean().optional(),
  }),
  careerCertification: z.object({
    name: z.string().min(1).max(200),
    provider: z.string().max(120).optional(),
    status: z.enum(['recommended', 'planned', 'in_progress', 'completed', 'expired']).optional(),
    skill: z.string().max(120).optional(),
    credentialId: z.string().max(120).optional(),
    targetDate: z.union([z.string(), z.coerce.date()]).optional().nullable(),
    notes: z.string().max(1000).optional(),
  }),
  careerCertificationUpdate: z.object({
    name: z.string().min(1).max(200).optional(),
    provider: z.string().max(120).optional(),
    status: z.enum(['recommended', 'planned', 'in_progress', 'completed', 'expired']).optional(),
    skill: z.string().max(120).optional(),
    credentialId: z.string().max(120).optional(),
    targetDate: z.union([z.string(), z.coerce.date()]).optional().nullable(),
    notes: z.string().max(1000).optional(),
  }),
  careerCertificationComplete: z.object({
    credentialId: z.string().max(120).optional(),
  }),
  collabCommunityCreate: z.object({
    name: z.string().min(2).max(120),
    slug: z.string().max(140).optional(),
    description: z.string().max(4000).optional(),
    type: z.enum(['public', 'private', 'institution', 'company', 'course', 'subject']).optional(),
    course: z.string().max(160).optional(),
    subject: z.string().max(160).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  collabCommunityUpdate: z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(4000).optional(),
    course: z.string().max(160).optional(),
    subject: z.string().max(160).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    coverUrl: z.string().max(500).optional(),
  }),
  collabDiscussionCreate: z.object({
    title: z.string().min(2).max(240),
    body: z.string().min(1).max(20000),
    tags: z.array(z.string().max(40)).max(20).optional(),
    mentions: z.array(z.string()).max(20).optional(),
  }),
  collabDiscussionReply: z.object({
    body: z.string().min(1).max(5000),
    parentReplyId: z.string().optional().nullable(),
    mentions: z.array(z.string()).max(20).optional(),
  }),
  collabReact: z.object({
    emoji: z.string().max(16).optional(),
  }),
  collabTeamCreate: z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(4000).optional(),
    communityId: z.string().optional().nullable(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  collabMemberAdd: z.object({
    userId: z.string().min(1),
    role: z.string().max(40).optional(),
  }),
  collabTeamWorkspace: z.object({
    sharedNotes: z.string().max(50000).optional(),
    sharedTaskIds: z.array(z.string()).max(100).optional(),
    sharedRoadmapIds: z.array(z.string()).max(50).optional(),
  }),
  collabShareTask: z.object({ taskId: z.string().min(1) }),
  collabShareRoadmap: z.object({ roadmapId: z.string().min(1) }),
  collabProjectCreate: z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(8000).optional(),
    teamId: z.string().optional().nullable(),
    communityId: z.string().optional().nullable(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  }),
  collabMilestone: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    dueDate: z.union([z.string(), z.coerce.date()]).optional().nullable(),
  }),
  collabConversationCreate: z.object({
    participantIds: z.array(z.string()).min(1).max(50),
    type: z.enum(['direct', 'group']).optional(),
    title: z.string().max(160).optional(),
    teamId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
  }),
  collabMentorProfile: z.object({
    headline: z.string().max(200).optional(),
    bio: z.string().max(5000).optional(),
    expertise: z.array(z.string().max(80)).max(30).optional(),
    domains: z.array(z.string().max(80)).max(20).optional(),
    languages: z.array(z.string().max(40)).max(20).optional(),
    availability: z
      .object({
        timezone: z.string().max(60).optional(),
        acceptingBookings: z.boolean().optional(),
        slots: z
          .array(
            z.object({
              day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
              start: z.string().max(8).optional(),
              end: z.string().max(8).optional(),
            })
          )
          .max(21)
          .optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  }),
  collabMentorBook: z.object({
    mentorId: z.string().min(1),
    topic: z.string().min(2).max(240),
    notes: z.string().max(4000).optional(),
    scheduledAt: z.union([z.string(), z.coerce.date()]),
    durationMin: z.coerce.number().min(15).max(180).optional(),
  }),
  collabBookingStatus: z.object({
    status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
    sessionNotes: z.string().max(8000).optional(),
  }),
  collabMentorRate: z.object({
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
  graphNodeCreate: z.object({
    label: z.string().min(1).max(240),
    kind: z.enum([
      'topic',
      'concept',
      'skill',
      'subject',
      'book',
      'course',
      'video',
      'animation',
      'lesson',
      'roadmap',
      'career',
      'project',
      'certification',
    ]),
    key: z.string().max(200).optional(),
    refType: z.string().max(40).optional(),
    refId: z.string().optional().nullable(),
    aliases: z.array(z.string().max(120)).max(20).optional(),
    weight: z.coerce.number().min(0).max(100).optional(),
    meta: z.record(z.any()).optional(),
    searchText: z.string().max(8000).optional(),
  }),
  graphEdgeCreate: z.object({
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
    type: z
      .enum(['related', 'requires', 'leads_to', 'teaches', 'part_of', 'uses', 'prepares_for'])
      .optional(),
    weight: z.coerce.number().min(0).max(10).optional(),
    meta: z.record(z.any()).optional(),
  }),
  graphFeedback: z.object({
    itemType: z.enum([
      'book',
      'course',
      'video',
      'animation',
      'lesson',
      'project',
      'certification',
      'career',
      'topic',
      'skill',
      'roadmap',
    ]),
    itemId: z.string().max(120).optional(),
    itemKey: z.string().max(200).optional(),
    score: z.coerce.number().min(0).max(100).optional(),
    reason: z.string().max(400).optional(),
    engaged: z.boolean().optional(),
    dismissed: z.boolean().optional(),
    source: z.string().max(40).optional(),
  }),
  adaptiveProfileUpdate: z.object({
    difficulty: z.enum(['easy', 'moderate', 'challenging', 'adaptive']).optional(),
    dailyGoalMinutes: z.coerce.number().min(5).max(480).optional(),
    dailyGoalTopics: z.coerce.number().min(1).max(20).optional(),
    weeklyFocus: z.string().max(160).optional(),
    learningSpeed: z.enum(['slow', 'moderate', 'fast']).optional(),
  }),
  adaptiveProgress: z.object({
    kind: z.enum(['topic', 'chapter', 'skill', 'course', 'animation', 'lesson']),
    key: z.string().max(200).optional(),
    label: z.string().max(240).optional(),
    percent: z.coerce.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
    refType: z.string().max(40).optional(),
    refId: z.string().optional().nullable(),
    resourceId: z.string().optional(),
    meta: z.record(z.any()).optional(),
  }),
  adaptiveAnimationMap: z.object({
    topics: z.array(z.string().max(120)).max(30).optional(),
    skills: z.array(z.string().max(80)).max(30).optional(),
    bookId: z.string().optional().nullable(),
    courseId: z.string().optional().nullable(),
    difficulty: z.enum(['easy', 'moderate', 'challenging', '']).optional(),
    learningObjectives: z.array(z.string().max(240)).max(20).optional(),
  }),
  adaptiveQuiz: z.object({
    topic: z.string().max(160).optional(),
    useAi: z.boolean().optional(),
  }),
  workspaceUpdate: z
    .object({
      name: z.string().min(1).max(120).optional(),
      layout: z.enum(['grid', 'list', 'focus']).optional(),
      theme: z.enum(['system', 'light', 'dark', 'focus']).optional(),
      pinnedNoteIds: z.array(z.string()).max(20).optional(),
      preferences: z
        .object({
          defaultView: z.enum(['day', 'week', 'month']).optional(),
          focusMinutes: z.coerce.number().min(5).max(120).optional(),
          breakMinutes: z.coerce.number().min(1).max(60).optional(),
          longBreakMinutes: z.coerce.number().min(5).max(60).optional(),
          pomodorosUntilLongBreak: z.coerce.number().min(2).max(12).optional(),
          workStartHour: z.coerce.number().min(0).max(23).optional(),
          workEndHour: z.coerce.number().min(0).max(23).optional(),
          quietHoursStart: z.coerce.number().min(0).max(23).optional(),
          quietHoursEnd: z.coerce.number().min(0).max(23).optional(),
          taskReminders: z.boolean().optional(),
          goalReminders: z.boolean().optional(),
          studyReminders: z.boolean().optional(),
          calendarNotifications: z.boolean().optional(),
          smartAlerts: z.boolean().optional(),
          weekStartsOn: z.coerce.number().min(0).max(6).optional(),
        })
        .optional(),
    })
    .strict(),
  workspaceWidgets: z.object({
    widgets: z
      .array(
        z.object({
          id: z.string().max(40).optional(),
          type: z.enum([
            'tasks',
            'goals',
            'calendar',
            'focus',
            'notes',
            'habits',
            'analytics',
            'ai_plan',
            'reminders',
            'progress',
          ]),
          title: z.string().max(80).optional(),
          visible: z.boolean().optional(),
          order: z.coerce.number().optional(),
          size: z.enum(['sm', 'md', 'lg']).optional(),
          config: z.record(z.any()).optional(),
        })
      )
      .max(20),
  }),
  smartSchedule: z.object({
    date: z.string().optional(),
  }),
  taskProgress: z.object({
    progress: z.coerce.number().min(0).max(100).optional(),
    loggedMinutes: z.coerce.number().min(0).optional(),
  }),
  taskDependencies: z.object({
    dependsOn: z.array(z.string()).max(20),
  }),
  productivityNote: z.object({
    title: z.string().min(1).max(240),
    content: z.string().max(100000).optional(),
    format: z.enum(['markdown', 'plain', 'html']).optional(),
    category: z.string().max(80).optional(),
    tags: z.array(z.string().max(40)).max(30).optional(),
    pinned: z.boolean().optional(),
    relatedTask: z.string().optional().nullable(),
    relatedGoal: z.string().optional().nullable(),
    attachments: z
      .array(
        z.object({
          name: z.string().max(240),
          url: z.string().max(500).optional(),
          mimeType: z.string().max(120).optional(),
          size: z.coerce.number().optional(),
        })
      )
      .max(20)
      .optional(),
  }),
  productivityNoteUpdate: z
    .object({
      title: z.string().min(1).max(240).optional(),
      content: z.string().max(100000).optional(),
      format: z.enum(['markdown', 'plain', 'html']).optional(),
      category: z.string().max(80).optional(),
      tags: z.array(z.string().max(40)).max(30).optional(),
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
      relatedTask: z.string().optional().nullable(),
      relatedGoal: z.string().optional().nullable(),
      attachments: z.array(z.any()).max(20).optional(),
    })
    .strict(),
  focusStart: z.object({
    title: z.string().max(160).optional(),
    mode: z.enum(['pomodoro', 'deep_work', 'study', 'break', 'custom']).optional(),
    plannedMinutes: z.coerce.number().min(1).max(240).optional(),
    breakMinutes: z.coerce.number().min(0).max(60).optional(),
    relatedTask: z.string().optional().nullable(),
    relatedGoal: z.string().optional().nullable(),
    notes: z.string().max(2000).optional(),
  }),
  focusComplete: z.object({
    interruptions: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional(),
  }),
  reminderEvent: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z
      .enum([
        'task',
        'study',
        'meeting',
        'focus',
        'habit',
        'assignment',
        'interview',
        'reminder',
        'other',
      ])
      .optional(),
    start: z.string().min(1),
    end: z.string().optional().nullable(),
    allDay: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    relatedTask: z.string().optional().nullable(),
    relatedGoal: z.string().optional().nullable(),
    reminderAt: z.string().optional().nullable(),
  }),
  personalizationPrivacy: z
    .object({
      personalizationEnabled: z.boolean().optional(),
      shareWithOrg: z.boolean().optional(),
      useCrossModuleData: z.boolean().optional(),
      useBehaviourTracking: z.boolean().optional(),
      allowMentorContext: z.boolean().optional(),
      allowRecommendations: z.boolean().optional(),
      consentVersion: z.string().max(20).optional(),
      consented: z.boolean().optional(),
    })
    .strict(),
  personalizationPreferences: z
    .object({
      learningStyle: z.enum(['visual', 'auditory', 'reading', 'kinesthetic', 'mixed']).optional(),
      pace: z.enum(['slow', 'moderate', 'fast']).optional(),
      difficulty: z.enum(['easy', 'moderate', 'challenging', 'adaptive']).optional(),
      mentorTone: z.enum(['supportive', 'direct', 'socratic', 'coach']).optional(),
      dashboardLayout: z.enum(['balanced', 'learning', 'career', 'productivity']).optional(),
      contentTypes: z.array(z.string().max(40)).max(12).optional(),
    })
    .strict(),
  platformEvent: z.object({
    type: z.enum([
      'learning_completed',
      'goal_achieved',
      'book_finished',
      'animation_completed',
      'community_activity',
      'career_milestone',
      'task_completed',
      'focus_completed',
      'research_progress',
      'recommendation_engaged',
      'recommendation_dismissed',
      'profile_refreshed',
      'consent_updated',
      'module_opened',
      'document_uploaded',
      'report_generated',
      'habit_milestone',
    ]),
    module: z
      .enum([
        'learning',
        'career',
        'research',
        'books',
        'media',
        'community',
        'productivity',
        'mentor',
        'adaptive',
        'graph',
        'system',
        'reports',
        'documents',
      ])
      .optional(),
    title: z.string().max(200).optional(),
    payload: z.record(z.any()).optional(),
    refType: z.string().max(60).optional(),
    refId: z.string().max(64).optional(),
  }),
  lmsCourseCreate: z.object({
    title: z.string().min(2).max(200),
    slug: z.string().min(2).max(220).optional(),
    description: z.string().max(8000).optional(),
    category: z.string().max(80).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    visibility: z.enum(['private', 'org', 'public']).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    estimatedHours: z.coerce.number().min(0).max(1000).optional(),
    versionNotes: z.string().max(2000).optional(),
    instructors: z.array(z.string()).max(50).optional(),
    prerequisites: z.array(z.string()).max(20).optional(),
    classSections: z.array(z.string()).max(50).optional(),
    academicCourse: z.string().optional().nullable(),
    thumbnailUrl: z.string().max(500).optional(),
  }),
  lmsCourseUpdate: z
    .object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().max(8000).optional(),
      category: z.string().max(80).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      visibility: z.enum(['private', 'org', 'public']).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      estimatedHours: z.coerce.number().min(0).max(1000).optional(),
      versionNotes: z.string().max(2000).optional(),
      bumpVersion: z.boolean().optional(),
      instructors: z.array(z.string()).max(50).optional(),
      prerequisites: z.array(z.string()).max(20).optional(),
      classSections: z.array(z.string()).max(50).optional(),
      academicCourse: z.string().optional().nullable(),
      thumbnailUrl: z.string().max(500).optional(),
    })
    .strict(),
  lmsModuleCreate: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(4000).optional(),
    order: z.coerce.number().int().min(0).optional(),
    prerequisites: z.array(z.string()).max(20).optional(),
    estimatedMinutes: z.coerce.number().min(0).max(10000).optional(),
  }),
  lmsLessonCreate: z.object({
    title: z.string().min(1).max(200),
    type: z.enum(['video', 'reading', 'pdf', 'interactive', 'ai']).optional(),
    order: z.coerce.number().int().min(0).optional(),
    body: z.string().max(100000).optional(),
    videoUrl: z.string().max(500).optional(),
    pdfUrl: z.string().max(500).optional(),
    aiPrompt: z.string().max(4000).optional(),
    content: z.record(z.any()).optional(),
    durationMinutes: z.coerce.number().min(0).max(600).optional(),
    prerequisites: z.array(z.string()).max(20).optional(),
    required: z.boolean().optional(),
  }),
  lmsEnroll: z.object({
    userId: z.string().optional(),
    classSectionId: z.string().optional().nullable(),
    role: z.enum(['student', 'instructor']).optional(),
  }),
  lmsAssignmentCreate: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(10000).optional(),
    module: z.string().optional().nullable(),
    lesson: z.string().optional().nullable(),
    dueAt: z.string().optional().nullable(),
    maxScore: z.coerce.number().min(0).max(1000).optional(),
    status: z.enum(['draft', 'open', 'closed']).optional(),
  }),
  lmsSubmissionCreate: z.object({
    content: z.string().max(50000).optional(),
    fileUrl: z.string().max(500).optional(),
  }),
  lmsGradeSubmission: z.object({
    score: z.coerce.number().min(0).max(1000),
    feedback: z.string().max(5000).optional(),
    returnToStudent: z.boolean().optional(),
  }),
  lmsQuizCreate: z
    .object({
      title: z.string().min(1).max(200),
      module: z.string().optional().nullable(),
      lesson: z.string().optional().nullable(),
      questionBank: z
        .array(
          z.object({
            question: z.string().min(1).max(2000),
            options: z.array(z.string().max(500)).max(8),
            answer: z.string().min(1).max(500),
            explanation: z.string().max(2000).optional(),
            tags: z.array(z.string().max(40)).max(10).optional(),
            difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
          })
        )
        .min(1)
        .max(200)
        .optional(),
      questions: z
        .array(
          z.object({
            question: z.string().min(1).max(2000),
            options: z.array(z.string().max(500)).max(8),
            answer: z.string().min(1).max(500),
            explanation: z.string().max(2000).optional(),
          })
        )
        .min(1)
        .max(200)
        .optional(),
      randomCount: z.coerce.number().int().min(0).max(100).optional(),
      maxAttempts: z.coerce.number().int().min(1).max(20).optional(),
      passPercent: z.coerce.number().min(0).max(100).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    })
    .refine((d) => (d.questionBank && d.questionBank.length) || (d.questions && d.questions.length), {
      message: 'questionBank or questions required',
    }),
  lmsQuizSubmit: z.object({
    answers: z.array(z.string().max(500)).max(100),
    questionIds: z.array(z.string()).max(100).optional(),
  }),
  lmsLessonComplete: z.object({
    minutes: z.coerce.number().min(0).max(600).optional(),
  }),
  lmsAiPlan: z.object({
    days: z.coerce.number().int().min(3).max(30).optional(),
  }),
};

module.exports = schemas;
