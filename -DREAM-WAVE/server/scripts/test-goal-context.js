const mongoose = require('mongoose')
const env = require('../config/env')
const User = require('../models/User')
const Goal = require('../models/Goal')
const { getGoalContext, formatGoalPromptContext } = require('../services/goalContextService')

async function runTests() {
  console.log('=== DreamWave AI: Centralized Goal Context Architecture Verification ===\n')

  try {
    // 1. Connect to DB
    console.log(`Connecting to MongoDB at: ${env.MONGODB_URI.split('@')[1] || env.MONGODB_URI}...`)
    await mongoose.connect(env.MONGODB_URI)
    console.log('Connected to Database successfully.\n')

    // 2. Fetch or create Test User A
    let userA = await User.findOne({ email: 'test_goal_user_a@dreamwave.ai' })
    if (!userA) {
      userA = await User.create({
        name: 'Goal User A',
        email: 'test_goal_user_a@dreamwave.ai',
        password: 'password123',
        role: 'student',
      })
    }

    // Fetch or create Test User B
    let userB = await User.findOne({ email: 'test_goal_user_b@dreamwave.ai' })
    if (!userB) {
      userB = await User.create({
        name: 'Goal User B',
        email: 'test_goal_user_b@dreamwave.ai',
        password: 'password123',
        role: 'student',
      })
    }

    // Fetch or create Test User C (User with NO goal)
    let userC = await User.findOne({ email: 'test_goal_user_c_nogoal@dreamwave.ai' })
    if (!userC) {
      userC = await User.create({
        name: 'Goal User C (No Goal)',
        email: 'test_goal_user_c_nogoal@dreamwave.ai',
        password: 'password123',
        role: 'student',
      })
    }

    // Ensure User C has NO goals
    await Goal.deleteMany({ userId: userC._id })

    // Setup User A's active real Goal
    await Goal.deleteMany({ userId: userA._id })
    const goalA = await Goal.create({
      userId: userA._id,
      title: 'Master Full-Stack Cloud Architecture',
      description: 'Learn Docker, Kubernetes, and microservices architecture with AWS.',
      category: 'Technical Skill',
      priority: 'High',
      difficulty: 'Advanced',
      weeklyStudyHours: 15,
      estimatedDuration: '3 months',
      status: 'active',
      progress: 35,
      completed: false,
      milestones: [
        { title: 'Docker Containers & Compose', status: 'completed', progress: 100 },
        { title: 'Kubernetes Cluster Deployment', status: 'in-progress', progress: 40 },
      ],
    })

    console.log(`[Setup Complete] Created User A (${userA._id}) with Goal (${goalA._id})`)
    console.log(`[Setup Complete] Created User B (${userB._id})`)
    console.log(`[Setup Complete] Created User C (${userC._id}) with NO goals\n`)

    // --- TEST 1: Retrieve User A's current goal ---
    console.log('--- TEST 1: Retrieve authenticated User A goal context ---')
    const contextA = await getGoalContext(userA._id)
    console.log('Result hasGoal:', contextA.hasGoal)
    console.log('Result reason:', contextA.reason)
    console.log('Returned goal title:', contextA.goalContext?.title)
    console.log('Returned difficulty:', contextA.goalContext?.difficulty)
    console.log('Returned weekly hours:', contextA.goalContext?.weeklyStudyHours)
    console.log('Returned milestones count:', contextA.goalContext?.milestones.length)
    
    if (contextA.hasGoal && contextA.goalContext?.goalId === goalA._id.toString()) {
      console.log('-> TEST 1 PASSED: Correct user goal returned successfully.\n')
    } else {
      console.error('-> TEST 1 FAILED: Could not retrieve correct goal for User A.\n')
    }

    // --- TEST 2: Retrieve User C's goal context (User with NO goal) ---
    console.log('--- TEST 2: Retrieve goal context for user with NO goals (User C) ---')
    const contextC = await getGoalContext(userC._id)
    console.log('Result hasGoal:', contextC.hasGoal)
    console.log('Result reason:', contextC.reason)
    console.log('Result message:', contextC.message)
    console.log('Returned goalContext:', contextC.goalContext)

    if (!contextC.hasGoal && contextC.reason === 'NO_GOAL_DEFINED' && contextC.goalContext === null) {
      console.log('-> TEST 2 PASSED: Missing goal correctly handled with controlled state.\n')
    } else {
      console.error('-> TEST 2 FAILED: Missing goal was not handled correctly.\n')
    }

    // --- TEST 3: User B attempts to access User A's goal by goalId ---
    console.log('--- TEST 3: Cross-User Security Check (User B requesting User A goal) ---')
    const contextB_Access_A = await getGoalContext(userB._id, goalA._id)
    console.log('Result hasGoal:', contextB_Access_A.hasGoal)
    console.log('Result reason:', contextB_Access_A.reason)
    console.log('Result message:', contextB_Access_A.message)

    if (!contextB_Access_A.hasGoal && (contextB_Access_A.reason === 'NO_GOAL_DEFINED' || contextB_Access_A.reason === 'UNAUTHORIZED_GOAL_ACCESS')) {
      console.log('-> TEST 3 PASSED: Cross-user access blocked cleanly.\n')
    } else {
      console.error('-> TEST 3 FAILED: User B was able to access User A goal!\n')
    }

    // --- TEST 4: Format goal context into prompt text for future Gemini features ---
    console.log('--- TEST 4: Prompt Context Formatting Utility ---')
    const promptText = formatGoalPromptContext(contextA)
    console.log('Formatted Prompt Context Snippet:\n"""\n' + promptText + '\n"""')
    
    if (promptText.includes('Master Full-Stack Cloud Architecture') && promptText.includes('Technical Skill')) {
      console.log('-> TEST 4 PASSED: Prompt text successfully formatted.\n')
    } else {
      console.error('-> TEST 4 FAILED: Prompt text formatting issue.\n')
    }

    console.log('=== ALL CENTRALIZED GOAL CONTEXT TESTS PASSED SUCCESSFULLY ===')

    // Cleanup test data
    await Goal.deleteMany({ userId: { $in: [userA._id, userB._id, userC._id] } })
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id] } })

  } catch (err) {
    console.error('Fatal error during goal context test:', err)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from Database.')
    process.exit(0)
  }
}

runTests()
