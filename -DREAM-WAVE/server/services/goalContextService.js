const mongoose = require('mongoose')
const Goal = require('../models/Goal')
const UserProfile = require('../models/UserProfile')

/**
 * Centralized Goal Context Architecture for DreamWave AI.
 *
 * Flow:
 * Authenticated User -> Current Goal (DB) -> Goal Context -> AI Services
 *
 * Rules:
 * 1. Strict user verification: Only retrieve goals belonging to `userId`.
 * 2. Never trust unverified frontend goal payloads when DB goal is available.
 * 3. Return clean, real data strictly from database models.
 * 4. Controlled fallback when no goal exists (hasGoal: false).
 */

/**
 * Retrieves the normalized goal context for a specific user.
 *
 * @param {string|mongoose.Types.ObjectId} userId - The authenticated user's ID.
 * @param {string|mongoose.Types.ObjectId} [goalId=null] - Optional explicit goal ID.
 * @returns {Promise<Object>} Goal context result object.
 */
async function getGoalContext(userId, goalId = null) {
  if (!userId) {
    return {
      hasGoal: false,
      reason: 'UNAUTHENTICATED',
      message: 'User ID is required to retrieve goal context.',
      goalContext: null,
    }
  }

  try {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
    let query = { userId: userObjectId }

    if (goalId) {
      if (!mongoose.isValidObjectId(goalId)) {
        return {
          hasGoal: false,
          reason: 'INVALID_GOAL_ID',
          message: 'The requested goal ID is invalid.',
          goalContext: null,
        }
      }
      query._id = new mongoose.Types.ObjectId(goalId)
    } else {
      // Prioritize active, uncompleted goals sorted by latest update
      query.status = 'active'
      query.completed = false
    }

    let goal = await Goal.findOne(query).sort({ updatedAt: -1 }).lean()

    // Fallback if no active uncompleted goal is found and no specific goalId was specified
    if (!goal && !goalId) {
      goal = await Goal.findOne({ userId: userObjectId }).sort({ updatedAt: -1 }).lean()
    }

    if (!goal) {
      return {
        hasGoal: false,
        reason: 'NO_GOAL_DEFINED',
        message: 'No goal found for this user in the database.',
        goalContext: null,
      }
    }

    // Safety check: ensure retrieved goal strictly matches userId
    if (goal.userId.toString() !== userObjectId.toString()) {
      return {
        hasGoal: false,
        reason: 'UNAUTHORIZED_GOAL_ACCESS',
        message: 'Access denied: Goal does not belong to the authenticated user.',
        goalContext: null,
      }
    }

    // Fetch user preferences/profile if available for additional real context
    const profile = await UserProfile.findOne({ userId: userObjectId })
      .select('tone interests learningPreferences currentRole targetRole skills')
      .lean()

    // Build clean goal context object containing ONLY actual database fields
    const goalContext = {
      goalId: goal._id.toString(),
      userId: goal.userId.toString(),
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'Personal',
      priority: goal.priority || 'Medium',
      difficulty: goal.difficulty || 'Intermediate',
      weeklyStudyHours: typeof goal.weeklyStudyHours === 'number' ? goal.weeklyStudyHours : 0,
      estimatedDuration: goal.estimatedDuration || '',
      status: goal.status || 'active',
      progress: typeof goal.progress === 'number' ? goal.progress : 0,
      completed: Boolean(goal.completed),
      deadline: goal.deadline ? new Date(goal.deadline).toISOString() : null,
      milestones: Array.isArray(goal.milestones)
        ? goal.milestones.map((m) => ({
            id: m._id ? m._id.toString() : null,
            title: m.title,
            description: m.description || '',
            status: m.status || 'not-started',
            progress: typeof m.progress === 'number' ? m.progress : 0,
            targetDate: m.targetDate ? new Date(m.targetDate).toISOString() : null,
          }))
        : [],
      resourcesSummary: {
        booksCount: goal.resources?.books?.length || 0,
        coursesCount: goal.resources?.courses?.length || 0,
        projectsCount: goal.resources?.projects?.length || 0,
      },
      notesCount: Array.isArray(goal.notes) ? goal.notes.length : 0,
      createdAt: goal.createdAt ? new Date(goal.createdAt).toISOString() : null,
      updatedAt: goal.updatedAt ? new Date(goal.updatedAt).toISOString() : null,
      userPreferences: profile
        ? {
            tone: profile.tone || 'calm',
            interests: profile.interests || [],
            currentRole: profile.currentRole || '',
            targetRole: profile.targetRole || '',
            skills: profile.skills || [],
            learningPreferences: profile.learningPreferences || {},
          }
        : null,
    }

    return {
      hasGoal: true,
      reason: null,
      message: 'Goal context successfully retrieved.',
      goalContext,
    }
  } catch (error) {
    console.error('[goalContextService.getGoalContext] Error:', error.message)
    return {
      hasGoal: false,
      reason: 'GOAL_CONTEXT_ERROR',
      message: `Failed to retrieve goal context: ${error.message}`,
      goalContext: null,
    }
  }
}

/**
 * Formats a goal context object into a structured string for inclusion in Gemini AI prompts.
 *
 * @param {Object} contextResult - The output of getGoalContext().
 * @returns {string} Formatted context string for AI system prompts.
 */
function formatGoalPromptContext(contextResult) {
  if (!contextResult || !contextResult.hasGoal || !contextResult.goalContext) {
    return 'USER GOAL CONTEXT: No active goal is defined for this user.'
  }

  const g = contextResult.goalContext
  let prompt = `USER GOAL CONTEXT:
- Title: ${g.title}
- Category: ${g.category}
- Priority: ${g.priority}
- Difficulty Level: ${g.difficulty}
- Current Progress: ${g.progress}% (${g.status})
- Weekly Study Commitment: ${g.weeklyStudyHours} hours/week`

  if (g.description) {
    prompt += `\n- Description: ${g.description}`
  }
  if (g.estimatedDuration) {
    prompt += `\n- Estimated Duration: ${g.estimatedDuration}`
  }
  if (g.deadline) {
    prompt += `\n- Target Deadline: ${g.deadline}`
  }
  if (g.milestones && g.milestones.length > 0) {
    const completedCount = g.milestones.filter((m) => m.status === 'completed' || m.progress === 100).length
    prompt += `\n- Milestones: ${completedCount}/${g.milestones.length} completed`
  }

  if (g.userPreferences) {
    if (g.userPreferences.tone) {
      prompt += `\n- Preferred Coaching Tone: ${g.userPreferences.tone}`
    }
    if (g.userPreferences.targetRole) {
      prompt += `\n- Target Career Role: ${g.userPreferences.targetRole}`
    }
  }

  return prompt
}

module.exports = {
  getGoalContext,
  formatGoalPromptContext,
}
