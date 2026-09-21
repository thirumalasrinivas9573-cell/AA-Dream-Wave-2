const ContentReport = require('../models/ContentReport');
const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const LibraryBook = require('../models/LibraryBook');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Review = require('../models/Review');
const StudentProfile = require('../models/StudentProfile');
const Promotion = require('../models/Promotion');
const PortalEvent = require('../models/PortalEvent');

const MODELS = {
  institution: Institution,
  company: CompanyProfile,
  book: LibraryBook,
  job: Job,
  internship: Internship,
  review: Review,
  promotion: Promotion,
  event: PortalEvent,
};

exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    if (!targetType || !mongoose.isValidObjectId(targetId) || !String(reason || '').trim()) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Valid targetType, targetId, and reason are required' });
    }
    const Model = MODELS[targetType];
    const exists = targetType === 'profile'
      ? await StudentProfile.exists({ $or: [{ _id: targetId }, { userId: targetId }] })
      : Model ? await Model.exists({ _id: targetId }) : targetType === 'other';
    if (!exists) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Reported content was not found.' });
    const item = await ContentReport.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason: String(reason).trim().slice(0, 500),
      details: String(details || '').trim().slice(0, 3000),
    });
    res.status(201).json({ success: true, item: { _id: item._id, status: item.status } });
  } catch (err) {
    console.error('[content-report.create]', err.message);
    res.status(500).json({ success: false, code: 'REPORT_CREATE_FAILED', message: 'Unable to submit report.' });
  }
};

exports.myReports = async (req, res) => {
  try {
    const items = await ContentReport.find({ reporterId: req.user._id }).sort('-createdAt').limit(50);
    res.json({ success: true, items });
  } catch (err) {
    console.error('[content-report.list]', err.message);
    res.status(500).json({ success: false, code: 'REPORT_LIST_FAILED', message: 'Unable to load reports.' });
  }
};
