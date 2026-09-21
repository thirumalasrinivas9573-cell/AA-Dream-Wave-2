const path = require('path');
const fs = require('fs');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');
const { generatePDF } = require('../utils/pdfGenerator');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { orgCreateStamp, orgListFilter, findAccessible } = require('../utils/orgScope');

exports.list = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30 });
  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { reports, pagination: paginationMeta(page, limit, total) },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const report = await findAccessible(Report, req.user, req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  res.json({ success: true, data: { report } });
});

exports.generate = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const stats = await analyticsService.getUserStats(req.user._id);
  stats.streak = req.user.streak;
  const generated = await aiService.generateReportSections(req.user.name, stats);
  const title = generated.title || req.body.title || 'Performance Report';
  const fileName = `report-${req.user._id}-${Date.now()}.pdf`;
  const pdfPath = await generatePDF(
    {
      title,
      career: req.body.career || 'Career Growth',
      userName: req.user.name,
      sections: generated.sections || [],
    },
    fileName
  );

  const report = await Report.create({
    ...orgCreateStamp(req.user),
    title,
    type: req.body.type || 'performance',
    career: req.body.career,
    data: stats,
    sections: generated.sections || [],
    pdfPath,
  });

  await Notification.create({
    user: req.user._id,
    title: 'Report ready',
    message: `"${report.title}" has been generated`,
    type: 'success',
    link: '/reports',
  });

  const { safeEmit } = require('../utils/platformEvents');
  await safeEmit(req.user, {
    type: 'report_generated',
    module: 'reports',
    title: report.title,
    refType: 'Report',
    refId: report._id,
    payload: { type: report.type },
  });

  res.status(201).json({ success: true, data: { report } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const report = await findAccessible(Report, req.user, req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  if (report.pdfPath && fs.existsSync(report.pdfPath)) {
    try {
      fs.unlinkSync(report.pdfPath);
    } catch {
      /* ignore */
    }
  }
  await report.deleteOne();
  res.json({ success: true, message: 'Report deleted' });
});

exports.downloadPdf = asyncHandler(async (req, res) => {
  const report = await findAccessible(Report, req.user, req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
    const fileName = `report-${report._id}.pdf`;
    report.pdfPath = await generatePDF(
      {
        title: report.title,
        career: report.career,
        userName: req.user.name,
        sections: report.sections,
      },
      fileName
    );
    await report.save();
  }
  res.download(report.pdfPath, path.basename(report.pdfPath));
});

exports.analytics = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getUserStats(req.user._id);
  stats.streak = req.user.streak;
  stats.level = req.user.level;
  stats.credits = req.user.credits;
  let productivity = null;
  let personalization = null;
  try {
    const productivitySvc = require('../services/productivityIntelligenceService');
    productivity = await productivitySvc.computeProductivityAnalytics(req.user, 'weekly');
  } catch {
    /* optional */
  }
  try {
    const personalizationSvc = require('../services/personalizationIntelligenceService');
    const profile = await personalizationSvc.getOrCreateProfile(req.user);
    personalization = {
      engagement: profile.engagement,
      sync: profile.sync,
      nextBest: profile.nextBest,
    };
  } catch {
    /* optional */
  }
  res.json({ success: true, data: { stats, productivity, personalization } });
});
