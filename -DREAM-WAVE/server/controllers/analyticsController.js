const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Chat = require('../models/Chat')
const Post = require('../models/Post')

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
// Returns platform-wide analytics (admin only in production -- here open for demo)
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalGoals,
      totalTasks,
      completedTasks,
      totalPosts,
      totalChats,
      proUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Goal.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ completed: true }),
      Post.countDocuments(),
      Chat.countDocuments(),
      User.countDocuments({ plan: 'pro' }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt plan').lean(),
    ])

    // Per-user stats for the requesting user
    const [myGoals, myTasks, myDone, myChats] = await Promise.all([
      Goal.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id, completed: true }),
      Chat.findOne({ userId: req.user._id, session: 'mentor' }),
    ])

    res.json({
      success: true,
      platform: {
        totalUsers,
        totalGoals,
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalPosts,
        totalChats,
        proUsers,
        recentUsers,
      },
      me: {
        goals:    myGoals,
        tasks:    myTasks,
        taskDone: myDone,
        aiChats:  Math.floor((myChats?.messages?.length || 0) / 2),
      },
    })
  } catch (err) {
    console.error('[analyticsController.getStats]', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}
