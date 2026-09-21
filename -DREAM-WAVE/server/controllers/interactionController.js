const Follow = require('../models/Follow');
const Bookmark = require('../models/Bookmark');
const Application = require('../models/Application');
const Review = require('../models/Review');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const LibraryBook = require('../models/LibraryBook');
const Promotion = require('../models/Promotion');
const mongoose = require('mongoose');
const { safeHttpUrl } = require('../utils/portalHelpers');

const fail = (res, status, message, code = 'INTERACTION_ERROR') => res.status(status).json({ success: false, code, message });
const validId = (id) => mongoose.isValidObjectId(id);
const cleanText = (value, max) => String(value || '').trim().slice(0, max);

async function targetExists(targetType, targetId) {
  if (!validId(targetId)) return false;
  if (targetType === 'institution') return Boolean(await Institution.exists({ _id: targetId, status: 'approved', isPublic: true }));
  if (targetType === 'company') return Boolean(await CompanyProfile.exists({ _id: targetId, status: 'approved', isPublic: true }));
  if (targetType === 'job') {
    const item = await Job.findOne({ _id: targetId, status: 'open' }).select('companyId').lean();
    return Boolean(item && await CompanyProfile.exists({ _id: item.companyId, status: 'approved', isPublic: true }));
  }
  if (targetType === 'internship') {
    const item = await Internship.findOne({ _id: targetId, status: 'open' }).select('companyId').lean();
    return Boolean(item && await CompanyProfile.exists({ _id: item.companyId, status: 'approved', isPublic: true }));
  }
  if (targetType === 'book') return Boolean(await LibraryBook.exists({ _id: targetId, status: 'active' }));
  if (targetType === 'promotion') return Boolean(await Promotion.exists({ _id: targetId, status: 'published' }));
  return false;
}

exports.follow = async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!['institution', 'company'].includes(targetType)) {
      return fail(res, 400, 'Invalid target type', 'VALIDATION_ERROR');
    }
    if (!await targetExists(targetType, targetId)) return fail(res, 404, 'Target not found', 'NOT_FOUND');
    const existing = await Follow.findOne({ studentId: req.user._id, targetType, targetId });
    if (existing) {
      await Follow.deleteOne({ _id: existing._id });
      const Model = targetType === 'institution' ? Institution : CompanyProfile;
      await Model.findByIdAndUpdate(targetId, { $inc: { 'stats.followers': -1 } });
      return res.json({ success: true, following: false });
    }
    await Follow.create({ studentId: req.user._id, targetType, targetId });
    const Model = targetType === 'institution' ? Institution : CompanyProfile;
    await Model.findByIdAndUpdate(targetId, { $inc: { 'stats.followers': 1 } });
    res.json({ success: true, following: true });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERACTION_ERROR', message: 'Unable to update follow status.' });
  }
};

exports.bookmark = async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!['institution', 'company', 'job', 'internship', 'book', 'promotion'].includes(targetType)) {
      return fail(res, 400, 'Invalid target type', 'VALIDATION_ERROR');
    }
    if (!await targetExists(targetType, targetId)) return fail(res, 404, 'Target not found', 'NOT_FOUND');
    const existing = await Bookmark.findOne({ studentId: req.user._id, targetType, targetId });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return res.json({ success: true, bookmarked: false });
    }
    await Bookmark.create({ studentId: req.user._id, targetType, targetId });
    res.json({ success: true, bookmarked: true });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERACTION_ERROR', message: 'Unable to update bookmark.' });
  }
};

exports.applyJob = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Job not found', 'NOT_FOUND');
    const job = await Job.findById(req.params.id);
    if (!job || job.status !== 'open') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    const dup = await Application.findOne({ studentId: req.user._id, targetType: 'job', targetId: job._id });
    if (dup) return res.status(400).json({ success: false, message: 'Already applied' });
    const app = await Application.create({
      studentId: req.user._id,
      companyId: job.companyId,
      targetType: 'job',
      targetId: job._id,
      coverLetter: cleanText(req.body.coverLetter, 5000),
      resumeUrl: safeHttpUrl(req.body.resumeUrl, { allowRelative: true }),
      status: 'pending',
    });
    job.applicationsCount += 1;
    await job.save();
    await CompanyProfile.findByIdAndUpdate(job.companyId, { $inc: { 'stats.applications': 1 } });
    res.status(201).json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, code: 'APPLICATION_ERROR', message: 'Unable to submit the job application.' });
  }
};

exports.applyInternship = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Internship not found', 'NOT_FOUND');
    const internship = await Internship.findById(req.params.id);
    if (!internship || internship.status !== 'open') {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }
    const dup = await Application.findOne({ studentId: req.user._id, targetType: 'internship', targetId: internship._id });
    if (dup) return res.status(400).json({ success: false, message: 'Already applied' });
    const app = await Application.create({
      studentId: req.user._id,
      companyId: internship.companyId,
      targetType: 'internship',
      targetId: internship._id,
      coverLetter: cleanText(req.body.coverLetter, 5000),
      resumeUrl: safeHttpUrl(req.body.resumeUrl, { allowRelative: true }),
      status: 'pending',
    });
    internship.applicationsCount = (internship.applicationsCount || 0) + 1;
    await internship.save();
    await CompanyProfile.findByIdAndUpdate(internship.companyId, { $inc: { 'stats.applications': 1 } });
    res.status(201).json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, code: 'APPLICATION_ERROR', message: 'Unable to submit the internship application.' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { targetType, targetId, rating, title, content, photos } = req.body;
    if (!['institution', 'company'].includes(targetType) || !validId(targetId)) return fail(res, 400, 'Valid targetType and targetId are required', 'VALIDATION_ERROR');
    if (!await targetExists(targetType, targetId)) return fail(res, 404, 'Target not found', 'NOT_FOUND');
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return fail(res, 400, 'Rating must be from 1 to 5', 'VALIDATION_ERROR');
    const review = await Review.create({
      studentId: req.user._id,
      targetType,
      targetId,
      rating: numericRating,
      title: cleanText(title, 200),
      content: cleanText(content, 5000),
      photos: Array.isArray(photos) ? photos.map((item) => safeHttpUrl(item, { allowRelative: true })).filter(Boolean).slice(0, 6) : [],
      status: 'pending',
    });
    if (targetType === 'institution') {
      await Institution.findByIdAndUpdate(targetId, { $inc: { 'stats.studentInterest': 1 } });
    }
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, code: 'REVIEW_ERROR', message: 'Unable to submit review.' });
  }
};

exports.reportReview = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Review not found', 'NOT_FOUND');
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const uid = String(req.user._id);
    if ((review.reportedBy || []).some((id) => String(id) === uid)) {
      return res.json({ success: true, message: 'Already reported' });
    }
    review.reportedBy = [...(review.reportedBy || []), req.user._id];
    review.reportCount = (review.reportCount || 0) + 1;
    if (review.reportCount >= 3) review.status = 'rejected';
    await review.save();
    res.json({ success: true, reportCount: review.reportCount });
  } catch (err) {
    res.status(500).json({ success: false, code: 'REVIEW_ERROR', message: 'Unable to report review.' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!['institution', 'company'].includes(targetType) || !validId(targetId)) return fail(res, 400, 'Valid targetType and targetId are required', 'VALIDATION_ERROR');
    const items = await Review.find({ targetType, targetId, status: 'approved' })
      .populate('studentId', 'name profileImage')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, code: 'REVIEW_ERROR', message: 'Unable to load reviews.' });
  }
};

exports.myFollows = async (req, res) => {
  try {
    const items = await Follow.find({ studentId: req.user._id }).sort('-createdAt');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERACTION_ERROR', message: 'Unable to load follows.' });
  }
};

exports.myBookmarks = async (req, res) => {
  try {
    const items = await Bookmark.find({ studentId: req.user._id }).sort('-createdAt');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERACTION_ERROR', message: 'Unable to load bookmarks.' });
  }
};

exports.myApplications = async (req, res) => {
  try {
    const items = await Application.find({ studentId: req.user._id })
      .sort('-createdAt')
      .limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, code: 'APPLICATION_ERROR', message: 'Unable to load applications.' });
  }
};

exports.followStatus = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!['institution', 'company'].includes(targetType) || !validId(targetId)) return fail(res, 400, 'Valid targetType and targetId are required', 'VALIDATION_ERROR');
    const [following, bookmarked] = await Promise.all([
      Follow.findOne({ studentId: req.user._id, targetType, targetId }),
      Bookmark.findOne({ studentId: req.user._id, targetType, targetId }),
    ]);
    res.json({ success: true, following: Boolean(following), bookmarked: Boolean(bookmarked) });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERACTION_ERROR', message: 'Unable to load interaction status.' });
  }
};

exports.applyAdmission = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Institution not found', 'NOT_FOUND');
    const inst = await Institution.findById(req.params.id);
    if (!inst || inst.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Institution not found' });
    }
    const dup = await Application.findOne({
      studentId: req.user._id,
      targetType: 'admission',
      targetId: inst._id,
    });
    if (dup) return res.status(400).json({ success: false, message: 'Already applied' });
    const app = await Application.create({
      studentId: req.user._id,
      institutionId: inst._id,
      targetType: 'admission',
      targetId: inst._id,
      coverLetter: cleanText(req.body.coverLetter, 5000),
      resumeUrl: safeHttpUrl(req.body.resumeUrl, { allowRelative: true }),
      status: 'pending',
    });
    await Institution.findByIdAndUpdate(inst._id, {
      $inc: { 'stats.applications': 1, 'stats.studentInterest': 2 },
    });
    res.status(201).json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, code: 'APPLICATION_ERROR', message: 'Unable to submit the admission application.' });
  }
};
