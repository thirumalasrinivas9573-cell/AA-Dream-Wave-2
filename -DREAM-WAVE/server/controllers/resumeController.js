const Resume = require('../models/Resume');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick } = require('../utils/helpers');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { orgCreateStamp, orgListFilter } = require('../utils/orgScope');

exports.get = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  let resume = await Resume.findOne({ ...filter, user: req.user._id }).sort({ updatedAt: -1 });
  if (!resume) {
    resume = await Resume.create({
      ...orgCreateStamp(req.user),
      title: 'My Resume',
      headline: req.user.targetCareer || '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
    });
  }
  res.json({ success: true, data: { resume } });
});

exports.update = asyncHandler(async (req, res) => {
  const fields = pick(req.body, [
    'title',
    'headline',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
  ]);
  const stamp = orgCreateStamp(req.user);
  let resume = await Resume.findOneAndUpdate(
    { user: req.user._id },
    { $set: { ...fields, ...stamp } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
  res.json({ success: true, data: { resume } });
});

exports.improve = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  let resume = await Resume.findOne({ user: req.user._id });
  if (!resume) throw new AppError('Resume not found', 404);
  const target = req.body.targetRole || req.user.targetCareer || 'Software Engineer';
  const prompt = `Improve this resume for ${target}. Return markdown with Summary, Experience bullets, Skills, Projects.\n\n${JSON.stringify(resume.toObject())}`;
  const suggestions = (await aiService.runMode('resume', [{ role: 'user', content: prompt }])).content;
  resume.aiSuggestions = suggestions;
  if (req.body.applySummary && suggestions) {
    resume.summary = suggestions.slice(0, 500);
  }
  await resume.save();
  await Notification.create({
    user: req.user._id,
    title: 'Resume improved',
    message: 'AI suggestions are ready on your resume',
    type: 'success',
    link: '/resume',
  });
  res.json({ success: true, data: { resume, suggestions } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});
