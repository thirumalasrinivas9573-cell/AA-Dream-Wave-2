const Recommendation = require('../models/Recommendation');
const LibraryBook = require('../models/LibraryBook');
const Course = require('../models/Course');
const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const LibraryCollection = require('../models/LibraryCollection');
const LibraryProgress = require('../models/LibraryProgress');
const Bookmark = require('../models/Bookmark');
const Goal = require('../models/Goal');
const Follow = require('../models/Follow');

/** Cross-entity AI recommendation engine — heuristic + optional OpenAI polish. */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const cached = await Recommendation.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort('-generatedAt');
    if (cached) {
      return res.json({ success: true, recommendations: cached.payload, reason: cached.reason, cached: true });
    }

    const [progress, bookmarks, goals, follows] = await Promise.all([
      LibraryProgress.find({ userId }).sort('-lastReadAt').limit(10).populate('bookId'),
      Bookmark.find({ studentId: userId }).limit(30),
      Goal.find({ userId }).sort('-updatedAt').limit(5),
      Follow.find({ studentId: userId }).limit(20),
    ]);

    const cats = [...new Set(progress.map((p) => p.bookId?.category).filter(Boolean))];
    const goalText = goals.map((g) => `${g.title} ${g.description || ''} ${(g.aiPlan || []).join(' ')}`).join(' ');
    const keywords = [...cats, ...goalText.split(/\s+/).filter((w) => w.length > 3)].slice(0, 12);

    const bookFilter = { status: 'active' };
    if (cats.length) bookFilter.category = { $in: cats };

    const followedInst = follows.filter((f) => f.targetType === 'institution').map((f) => f.targetId);
    const followedCo = follows.filter((f) => f.targetType === 'company').map((f) => f.targetId);

    const [books, courses, institutions, companies, jobs, internships, learningPaths] = await Promise.all([
      LibraryBook.find(bookFilter).sort('-views').limit(8),
      Course.find({ status: 'active' }).sort('-createdAt').limit(8),
      Institution.find({
        status: 'approved',
        isPublic: true,
        ...(followedInst.length ? { _id: { $nin: followedInst } } : {}),
      }).sort('-stats.aiRating -stats.followers').limit(8),
      CompanyProfile.find({
        status: 'approved',
        isPublic: true,
        ...(followedCo.length ? { _id: { $nin: followedCo } } : {}),
      }).sort('-stats.aiScore -stats.followers').limit(8),
      Job.find({ status: 'open' }).sort('-createdAt').limit(8).populate('companyId', 'name slug'),
      Internship.find({ status: 'open' }).sort('-createdAt').limit(8).populate('companyId', 'name slug'),
      LibraryCollection.find({ status: 'published', type: { $in: ['learning-path', 'career', 'course'] } }).limit(6),
    ]);

    let careerRoadmaps = goals.map((g) => ({
      goalId: g._id,
      title: g.title,
      progress: g.progress,
      plan: (g.aiPlan || []).slice(0, 6),
    }));

    // Optional text boost for jobs/books matching goals
    if (keywords.length) {
      try {
        const q = keywords.slice(0, 5).join(' ');
        const [extraBooks, extraJobs] = await Promise.all([
          LibraryBook.find({ status: 'active', $text: { $search: q } }).limit(4),
          Job.find({ status: 'open', $text: { $search: q } }).limit(4),
        ]);
        const bookIds = new Set(books.map((b) => String(b._id)));
        extraBooks.forEach((b) => { if (!bookIds.has(String(b._id))) books.unshift(b); });
        const jobIds = new Set(jobs.map((j) => String(j._id)));
        extraJobs.forEach((j) => { if (!jobIds.has(String(j._id))) jobs.unshift(j); });
      } catch { /* text index may miss */ }
    }

    const payload = {
      books: books.slice(0, 8),
      courses,
      institutions,
      companies,
      jobs: jobs.slice(0, 8),
      internships,
      learningPaths,
      careerRoadmaps,
    };

    const reason = [
      cats.length ? `Reading categories: ${cats.join(', ')}` : null,
      goals.length ? `Active goals: ${goals.map((g) => g.title).join(', ')}` : null,
      bookmarks.length ? `${bookmarks.length} bookmarks` : null,
      follows.length ? `${follows.length} follows` : null,
    ].filter(Boolean).join(' · ') || 'Based on popular live platform activity';

    await Recommendation.create({
      userId,
      payload,
      reason,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000),
    });

    res.json({ success: true, recommendations: payload, reason, cached: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
