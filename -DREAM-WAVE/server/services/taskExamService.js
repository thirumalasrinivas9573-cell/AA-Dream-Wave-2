const crypto = require('crypto')
const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const openaiService = require('./openaiService')
const {
  createProgressionError,
  verifyLearning,
} = require('./taskProgressionService')
const progressionConfig = require('../config/progression')
const {
  MINIMUM_PASSING_PERCENTAGE,
  EXAM_QUESTION_COUNT,
  EXAM_TIME_LIMIT_MINUTES,
} = progressionConfig

/**
 * Fisher-Yates array shuffle.
 */
function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Server-side option shuffling and recomputing of correctIndex.
 * Eliminates AI positional bias and client guessing.
 */
function shuffleAndAssignIds(questions) {
  return questions.map((q) => {
    const origOptions = Array.isArray(q.options) ? q.options : []
    const correctOptionText = origOptions[q.correctIndex]
    const shuffledOptions = shuffleArray(origOptions)
    const newCorrectIndex = shuffledOptions.indexOf(correctOptionText)

    const questionId = 'q_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)

    return {
      questionId,
      question: q.question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      explanation: q.explanation || 'Verified correct conceptual solution.',
    }
  })
}

/**
 * Deterministic scenario question generator for non-production fallback.
 */
function generateFallbackQuestions(task, count = EXAM_QUESTION_COUNT) {
  const title = (task.learningSnapshot?.title || task.title || 'Technical Architecture').slice(0, 200)
  const fallbackBank = [
    {
      question: `In the context of ${title}, which architecture pattern best guarantees fault tolerance and data consistency during high-load spikes?`,
      options: [
        'Idempotent consumers with dead-letter queue backpressure',
        'Synchronous RPC calls with unbounded retries',
        'Shared global in-memory counters with file locks',
        'Direct database writes bypassing replication lag',
      ],
      correctIndex: 0,
      explanation:
        'Idempotent consumers and dead-letter queues prevent duplicated state mutations and maintain system availability under spike load.',
    },
    {
      question: `When diagnosing performance bottlenecks related to ${title}, what metric provides the most reliable leading indicator of resource exhaustion?`,
      options: [
        '99th percentile request latency and event loop lag',
        'Raw CPU clock frequency',
        'Total number of closed TCP sockets',
        'File descriptor creation date',
      ],
      correctIndex: 0,
      explanation:
        'p99 latency combined with runtime event loop lag indicates latency tail degradation before fatal system crashes occur.',
    },
    {
      question: `Which security control is most critical when verifying inputs and managing state transitions in ${title}?`,
      options: [
        'Server-side atomic transition validation and input schema sanitization',
        'Client-side disabled HTML buttons and form tags',
        'Obfuscating client JavaScript bundle variable names',
        'Using base64 encoding for sensitive parameters',
      ],
      correctIndex: 0,
      explanation:
        'Security boundaries must be enforced on the server using atomic updates and schema validation to prevent race conditions and client bypass.',
    },
    {
      question: `What is the primary risk of relying on optimistic state updates without compensating transactions in ${title}?`,
      options: [
        'Phantom reads and corrupted state divergence across clients',
        'Increased disk fragmentation on secondary indexes',
        'Deprecation of HTTP protocol headers',
        'Automatic garbage collection pauses',
      ],
      correctIndex: 0,
      explanation:
        'Optimistic updates without rollbacks cause client and server views to diverge, creating ghost state and corrupted workflows.',
    },
    {
      question: `How should idempotent operations be implemented for ${title} to prevent duplicate processing on network retries?`,
      options: [
        'Deduplicate by unique request/idempotency keys with distributed lock or atomic check',
        'Increase HTTP request timeout to 300 seconds',
        'Send random payload timestamps on each retry',
        'Drop subsequent requests randomly',
      ],
      correctIndex: 0,
      explanation:
        'Unique idempotency keys evaluated atomically prevent re-execution of non-idempotent business logic.',
    },
    {
      question: `When designing automated validation for ${title}, which testing strategy yields the highest confidence for regression avoidance?`,
      options: [
        'End-to-end integration tests combined with strict state-machine contract tests',
        'Only testing happy-path user flows without error injection',
        'Relying solely on static code analysis linters',
        'Manual ad-hoc testing before production deployment',
      ],
      correctIndex: 0,
      explanation:
        'Contract and state-machine tests verify all valid and invalid transitions under race conditions and error edge cases.',
    },
    {
      question: `What strategy is best suited to manage database connection saturation during peak workloads for ${title}?`,
      options: [
        'Configuring fixed connection pooling with circuit breakers and queue limits',
        'Spawning a new database connection per incoming HTTP query without limit',
        'Restarting the database server every hour',
        'Ignoring connection pool exhaustion warnings',
      ],
      correctIndex: 0,
      explanation:
        'Bounded connection pools paired with circuit breakers protect backend persistence layers from cascading collapse.',
    },
    {
      question: `In distributed caching for ${title}, how can cache stampede (thundering herd) be prevented when a critical cache key expires?`,
      options: [
        'Probabilistic early expiration (XFetch) or mutex locking on cache miss',
        'Setting TTL to zero on all keys',
        'Flushing the entire cache periodically',
        'Serving raw HTTP 500 errors on cache miss',
      ],
      correctIndex: 0,
      explanation:
        'Mutex locks or probabilistic early recomputation prevent thousands of simultaneous queries from overwhelming the backing database.',
    },
    {
      question: `Which data model design ensures scalable history tracking and audit logging in ${title}?`,
      options: [
        'Append-only immutable event logs with read-model projections',
        'Directly overwriting historical documents in place',
        'Storing audit entries in volatile temporary memory',
        'Relying on web server access log text files',
      ],
      correctIndex: 0,
      explanation:
        'Append-only event logs guarantee an untampered historical record and support reproducible state projections.',
    },
    {
      question: `What is the optimal rollback policy when an automated workflow fails midway during execution of ${title}?`,
      options: [
        'Execute compensating rollback actions and reset workflow stage atomically',
        'Leave incomplete partial state and continue silently',
        'Delete the user record and entire task history',
        'Ignore the failure and mark the workflow complete anyway',
      ],
      correctIndex: 0,
      explanation:
        'Compensating actions and atomic resets return the system to a known valid checkpoint and require clean re-verification.',
    },
  ]

  const questions = []
  for (let i = 0; i < count; i++) {
    const template = fallbackBank[i % fallbackBank.length]
    questions.push({
      question: template.question,
      options: [...template.options],
      correctIndex: template.correctIndex,
      explanation: template.explanation,
    })
  }

  return shuffleAndAssignIds(questions)
}

/**
 * Generate questions using the existing OpenAI/Sage AI service wrapper.
 */
async function generateExamQuestions(task) {
  const frozenTitle = (task.learningSnapshot?.title || task.title || '').slice(0, 200)
  const topic = [frozenTitle, task.description].filter(Boolean).join(' - ')
  const subtasksText =
    Array.isArray(task.subtasks) && task.subtasks.length > 0
      ? `Subtasks covered: ` + task.subtasks.map((s) => s.title).join(', ')
      : ''
  const checklistText =
    Array.isArray(task.checklist) && task.checklist.length > 0
      ? `Checklist items: ` + task.checklist.map((c) => c.text).join(', ')
      : ''

  const systemPrompt = `You are a strict, senior technical examiner creating a HARD, scenario-based certification exam for Dream Wave AI.
The exam must test deep conceptual understanding, practical problem solving, and edge-case analysis.
Do NOT create simple recall or trivia questions. Create real-world scenario questions with 4 distinct plausible options.

TOPIC: ${topic}
${subtasksText}
${checklistText}

OUTPUT FORMAT:
Respond with ONLY a JSON object matching this exact schema:
{
  "questions": [
    {
      "question": "Scenario or problem statement...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why the correct answer is right and why others are wrong."
    }
  ]
}
Generate exactly ${EXAM_QUESTION_COUNT} questions.
Each question MUST have exactly 4 options.
correctIndex MUST be an integer from 0 to 3 pointing to the correct option in options array.`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate ${EXAM_QUESTION_COUNT} hard scenario questions for '${topic}' in valid JSON.`,
    },
  ]

  let aiResult = null
  try {
    aiResult = await openaiService.robustAiCall(messages, 'gpt-4o-mini', null)
  } catch (_err) {
    aiResult = null
  }

  const rawQuestions = Array.isArray(aiResult?.questions) ? aiResult.questions : []
  const validated = []

  for (const q of rawQuestions) {
    if (
      typeof q?.question === 'string' &&
      q.question.trim().length > 0 &&
      Array.isArray(q?.options) &&
      q.options.length === 4 &&
      q.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0) &&
      new Set(q.options.map((o) => o.trim())).size === 4 &&
      Number.isInteger(q?.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3
    ) {
      validated.push({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
        explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
      })
    }
  }

  if (validated.length === EXAM_QUESTION_COUNT) {
    return shuffleAndAssignIds(validated)
  }

  if (progressionConfig.ALLOW_FALLBACK_EXAM) {
    return generateFallbackQuestions(task, EXAM_QUESTION_COUNT)
  }

  throw createProgressionError(
    'Failed to generate exam questions. Please try again.',
    'EXAM_GENERATION_FAILED',
    500,
  )
}

/**
 * Starts or resumes a task certification exam.
 */
async function startExam(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  if (
    task.stageStatus === 'exam_passed' ||
    task.progressionStage === 'certification' ||
    task.progressionStage === 'completed'
  ) {
    throw createProgressionError(
      'Exam has already been passed for this task.',
      'EXAM_ALREADY_PASSED',
      400,
    )
  }

  const existingExam = await TaskExam.findOne({ taskId: task._id, userId })
  const lastAttempt = existingExam?.attempts?.[existingExam.attempts.length - 1]
  const isRetake = Boolean(lastAttempt && !lastAttempt.passed)
  const newEffortSince = isRetake ? lastAttempt.evaluatedAt : null

  // Verify learning requirements (including retake effort if applicable)
  const verification = await verifyLearning(task, { newEffortSince })
  if (!verification.verified) {
    throw createProgressionError(
      'Learning requirements not met before starting exam.',
      'LEARNING_INCOMPLETE',
      400,
      { requirements: verification.requirements },
    )
  }

  // Safety net: auto-verify if all requirements are met but not yet recorded
  if (!task.learningVerifiedAt) {
    task.learningVerifiedAt = new Date()
    task.stageStatus = 'learning_completed'
    await task.save()
  }

  const frozenTitle = (task.learningSnapshot?.title || task.title || 'Technical Assessment').slice(0, 200)
  const now = new Date()

  // Resume active unexpired exam if not a retake
  if (
    !isRetake &&
    existingExam &&
    existingExam.status === 'active' &&
    existingExam.expiresAt &&
    now < new Date(existingExam.expiresAt) &&
    Array.isArray(existingExam.questions) &&
    existingExam.questions.length > 0
  ) {
    return {
      examId: String(existingExam._id),
      taskId: String(task._id),
      topic: existingExam.topic,
      difficulty: existingExam.difficulty,
      passingPercentage: existingExam.passingPercentage,
      questionCount: existingExam.questions.length,
      startedAt: existingExam.startedAt,
      expiresAt: existingExam.expiresAt,
      resumed: true,
      questions: existingExam.questions.map((q) => ({
        questionId: q.questionId,
        question: q.question,
        options: q.options,
      })),
    }
  }

  // If existing exam expired, mark abandoned
  if (
    existingExam &&
    existingExam.status === 'active' &&
    existingExam.expiresAt &&
    now >= new Date(existingExam.expiresAt)
  ) {
    existingExam.status = 'abandoned'
    await existingExam.save()
  }

  // Generate fresh questions
  const questions = await generateExamQuestions(task)
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + EXAM_TIME_LIMIT_MINUTES * 60 * 1000)

  let exam = existingExam
  if (!exam) {
    exam = new TaskExam({
      taskId: task._id,
      userId: task.userId,
      topic: frozenTitle,
      difficulty: 'HARD',
      passingPercentage: MINIMUM_PASSING_PERCENTAGE,
      questions,
      status: 'active',
      startedAt,
      expiresAt,
      attempts: [],
    })
  } else {
    exam.topic = frozenTitle
    exam.difficulty = 'HARD'
    exam.passingPercentage = MINIMUM_PASSING_PERCENTAGE
    exam.questions = questions
    exam.status = 'active'
    exam.startedAt = startedAt
    exam.expiresAt = expiresAt
  }

  await exam.save()

  task.stageStatus = 'exam_active'
  task.progressionStage = 'exam'
  await task.save()

  // Update task state to exam_active
  task.progressionStage = 'exam'
  task.stageStatus = 'exam_active'
  task.examId = exam._id
  if (!task.learningVerifiedAt) {
    task.learningVerifiedAt = new Date()
  }
  await task.save()

  // Return sanitized exam (NEVER correctIndex or explanation)
  return {
    examId: String(exam._id),
    taskId: String(task._id),
    topic: exam.topic,
    difficulty: exam.difficulty,
    passingPercentage: exam.passingPercentage,
    questionCount: exam.questions.length,
    startedAt: exam.startedAt,
    expiresAt: exam.expiresAt,
    resumed: false,
    questions: exam.questions.map((q) => ({
      questionId: q.questionId,
      question: q.question,
      options: q.options,
    })),
  }
}

/**
 * Submits and grades a task certification exam.
 */
async function submitExam(taskId, userId, answers) {
  if (!Array.isArray(answers)) {
    throw createProgressionError(
      'Answers must be an array of submissions.',
      'INVALID_ANSWERS',
      400,
    )
  }

  const seenQuestionIds = new Set()
  for (const ans of answers) {
    if (!ans || typeof ans.questionId !== 'string' || !ans.questionId.trim()) {
      throw createProgressionError(
        'Each answer must have a valid questionId.',
        'INVALID_ANSWERS',
        400,
      )
    }
    if (seenQuestionIds.has(ans.questionId)) {
      throw createProgressionError(
        `Duplicate answer submission for question ${ans.questionId}.`,
        'INVALID_ANSWERS',
        400,
      )
    }
    seenQuestionIds.add(ans.questionId)

    if (ans.selectedIndex !== null && ans.selectedIndex !== undefined) {
      if (
        !Number.isInteger(ans.selectedIndex) ||
        ans.selectedIndex < 0 ||
        ans.selectedIndex > 3
      ) {
        throw createProgressionError(
          `Invalid option index selected for question ${ans.questionId}.`,
          'INVALID_ANSWERS',
          400,
        )
      }
    }
  }

  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  const existingExam = await TaskExam.findOne({ taskId: task._id, userId }).select(
    '+questions.correctIndex +questions.explanation',
  )
  if (!existingExam) {
    throw createProgressionError('No exam found for this task.', 'EXAM_NOT_ACTIVE', 404)
  }

  if (existingExam.status !== 'active') {
    throw createProgressionError('Exam is not currently active.', 'EXAM_NOT_ACTIVE', 409)
  }

  const now = new Date()
  if (existingExam.expiresAt && now > new Date(existingExam.expiresAt)) {
    existingExam.status = 'abandoned'
    await existingExam.save()

    task.stageStatus = 'learning_active'
    task.progressionStage = 'learning'
    task.learningVerifiedAt = null
    await task.save()

    throw createProgressionError(
      'Exam session has expired. Please review learning material and restart.',
      'EXAM_EXPIRED',
      400,
    )
  }

  // Atomic state flip active -> submitted prevents double-submit race condition
  const exam = await TaskExam.findOneAndUpdate(
    { _id: existingExam._id, status: 'active' },
    { $set: { status: 'submitted' } },
    { new: true },
  ).select('+questions.correctIndex +questions.explanation')

  if (!exam) {
    throw createProgressionError(
      'Exam has already been submitted or is no longer active.',
      'EXAM_NOT_ACTIVE',
      409,
    )
  }

  const questionMap = new Map()
  for (const q of exam.questions) {
    questionMap.set(q.questionId, q)
  }

  for (const ans of answers) {
    if (!questionMap.has(ans.questionId)) {
      throw createProgressionError(
        `Question ${ans.questionId} does not belong to this exam.`,
        'INVALID_ANSWERS',
        400,
      )
    }
  }

  // Server-side scoring (ignoring any client score/passed payload fields)
  const answersByQId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]))
  let correctCount = 0
  const totalQuestions = exam.questions.length
  const submittedAnswers = []
  const resultsForClient = []

  for (const q of exam.questions) {
    const selectedIndex = answersByQId.has(q.questionId)
      ? answersByQId.get(q.questionId)
      : null
    const isCorrect =
      selectedIndex !== null &&
      selectedIndex !== undefined &&
      selectedIndex === q.correctIndex

    if (isCorrect) {
      correctCount++
    }

    submittedAnswers.push({
      questionId: q.questionId,
      selectedIndex,
      isCorrect,
    })
  }

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const minimumPassingPercentage = exam.passingPercentage || MINIMUM_PASSING_PERCENTAGE
  const passed = score >= minimumPassingPercentage

  const attemptNumber = (exam.attempts?.length || 0) + 1
  const evaluatedAt = new Date()

  exam.attempts.push({
    attemptNumber,
    score,
    passed,
    submittedAnswers,
    startedAt: exam.startedAt,
    evaluatedAt,
  })
  await exam.save()

  task.examAttemptsCount = (task.examAttemptsCount || 0) + 1

  if (passed) {
    task.stageStatus = 'exam_passed'
    task.progressionStage = 'certification'
    await task.save()
  } else {
    // Revert to learning on failure
    task.stageStatus = 'learning_active'
    task.progressionStage = 'learning'
    task.learningVerifiedAt = null
    await task.save()
  }

  for (const sub of submittedAnswers) {
    const q = questionMap.get(sub.questionId)
    if (passed) {
      resultsForClient.push({
        questionId: sub.questionId,
        selectedIndex: sub.selectedIndex,
        isCorrect: sub.isCorrect,
        explanation: q.explanation || '',
      })
    } else {
      resultsForClient.push({
        questionId: sub.questionId,
        selectedIndex: sub.selectedIndex,
        isCorrect: sub.isCorrect,
      })
    }
  }

  return {
    score,
    passed,
    minimumPassingPercentage,
    attemptNumber,
    correctCount,
    totalCount: totalQuestions,
    nextStage: passed ? 'certification' : 'learning',
    questions: resultsForClient,
  }
}

module.exports = {
  startExam,
  submitExam,
  generateExamQuestions,
  shuffleAndAssignIds,
}
