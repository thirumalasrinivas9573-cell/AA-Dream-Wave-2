const mongoose = require('mongoose')
const PDFDocument = require('pdfkit')
const CareerProfile = require('../models/CareerProfile')
const Resume = require('../models/Resume')
const StudentProfile = require('../models/StudentProfile')
const User = require('../models/User')
const Job = require('../models/Job')
const Internship = require('../models/Internship')
const CompanyProfile = require('../models/CompanyProfile')
const Application = require('../models/Application')
const Bookmark = require('../models/Bookmark')
const Notification = require('../models/Notification')

const RESUME_FIELDS = ['title', 'template', 'status', 'personal', 'education', 'skills', 'projects', 'experience', 'internships', 'certifications', 'achievements', 'languages', 'socialLinks', 'references']
const PROFILE_FIELDS = ['targetCareer', 'targetRoles', 'preferredLocations', 'preferredIndustries', 'preferredWorkModes', 'preferredJobTypes', 'salaryExpectation', 'openToJobs', 'openToInternships', 'recruiterVisible', 'requiredSkills']
const ARRAY_LIMITS = {
  education: 20, skills: 80, projects: 30, experience: 30, internships: 30,
  certifications: 50, achievements: 50, languages: 20, socialLinks: 15, references: 10,
}

const fail = (res, status, message, code = 'CAREER_ERROR') => res.status(status).json({ success: false, code, message })
const pick = (source, fields) => Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
const text = (value, max = 1000) => String(value || '').trim().slice(0, max)
const list = (value, max = 30, itemMax = 120) => Array.isArray(value) ? value.slice(0, max).map((item) => text(item, itemMax)).filter(Boolean) : []
const validId = (value) => mongoose.isValidObjectId(value)
const safeUrl = (value) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return ''
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return ''
    return url.toString().slice(0, 1000)
  } catch {
    return ''
  }
}
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function ensureCareerProfile(userId) {
  let profile = await CareerProfile.findOne({ userId })
  if (!profile) {
    try {
      profile = await CareerProfile.create({ userId })
    } catch (error) {
      if (error.code !== 11000) throw error
      profile = await CareerProfile.findOne({ userId })
    }
  }
  return profile
}

function cleanCareerProfile(body) {
  const data = pick(body, PROFILE_FIELDS)
  if (data.targetCareer !== undefined) data.targetCareer = text(data.targetCareer, 160)
  for (const field of ['targetRoles', 'preferredLocations', 'preferredIndustries', 'requiredSkills']) {
    if (data[field] !== undefined) data[field] = list(data[field], 30, 120)
  }
  if (data.preferredWorkModes !== undefined) data.preferredWorkModes = list(data.preferredWorkModes).filter((item) => ['onsite', 'remote', 'hybrid'].includes(item))
  if (data.preferredJobTypes !== undefined) data.preferredJobTypes = list(data.preferredJobTypes).filter((item) => ['full-time', 'part-time', 'contract', 'remote', 'graduate', 'apprenticeship', 'campus'].includes(item))
  if (data.salaryExpectation !== undefined) data.salaryExpectation = {
    min: Math.max(0, Number(data.salaryExpectation?.min) || 0),
    max: Math.max(0, Number(data.salaryExpectation?.max) || 0),
    currency: text(data.salaryExpectation?.currency || 'INR', 8).toUpperCase(),
  }
  return data
}

function cleanResume(body) {
  const data = pick(body, RESUME_FIELDS)
  if (data.title !== undefined) data.title = text(data.title, 120) || 'Professional Resume'
  if (data.personal !== undefined) {
    data.personal = {
      fullName: text(data.personal?.fullName, 120),
      headline: text(data.personal?.headline, 180),
      email: text(data.personal?.email, 200),
      phone: text(data.personal?.phone, 40),
      location: text(data.personal?.location, 200),
      summary: text(data.personal?.summary, 3000),
      portfolio: safeUrl(data.personal?.portfolio),
      github: safeUrl(data.personal?.github),
      linkedin: safeUrl(data.personal?.linkedin),
    }
  }
  for (const [field, limit] of Object.entries(ARRAY_LIMITS)) {
    if (data[field] !== undefined) data[field] = Array.isArray(data[field]) ? data[field].slice(0, limit) : []
  }
  if (data.skills) data.skills = data.skills.map((item) => ({ name: text(item.name, 100), category: text(item.category || 'Technical', 80), level: Math.max(0, Math.min(100, Number(item.level) || 0)) })).filter((item) => item.name)
  if (data.projects) data.projects = data.projects.map((item) => ({
    title: text(item.title, 200), description: text(item.description, 3000),
    technologies: list(item.technologies, 30, 100), githubUrl: safeUrl(item.githubUrl), demoUrl: safeUrl(item.demoUrl),
  })).filter((item) => item.title)
  if (data.socialLinks) data.socialLinks = data.socialLinks.map((item) => ({ label: text(item.label, 80), url: safeUrl(item.url) })).filter((item) => item.label && item.url)
  return data
}

function resumeAnalysis(resume, keywords = []) {
  const missingSections = []
  const suggestions = []
  const sectionChecks = [
    ['professional summary', Boolean(resume.personal?.summary)],
    ['skills', resume.skills?.length >= 3],
    ['education', resume.education?.length > 0],
    ['projects or experience', (resume.projects?.length || 0) + (resume.experience?.length || 0) + (resume.internships?.length || 0) > 0],
    ['contact information', Boolean(resume.personal?.email && resume.personal?.phone)],
  ]
  sectionChecks.forEach(([name, complete]) => { if (!complete) missingSections.push(name) })
  if (!resume.personal?.headline) suggestions.push('Add a role-focused professional headline.')
  if ((resume.personal?.summary || '').length < 80) suggestions.push('Use a concise 2–4 line summary with measurable strengths.')
  if (!resume.projects?.some((item) => item.technologies?.length)) suggestions.push('Add technology stacks and outcomes to projects.')
  const skills = new Set((resume.skills || []).map((item) => item.name.toLowerCase()))
  const requested = list(keywords, 50, 100)
  const missingSkills = requested.filter((item) => !skills.has(item.toLowerCase()))
  const keywordMatch = requested.length ? Math.round((requested.length - missingSkills.length) / requested.length * 100) : 0
  const strength = Math.max(0, Math.min(100, Math.round(sectionChecks.filter(([, complete]) => complete).length / sectionChecks.length * 70 + Math.min(30, (resume.skills?.length || 0) * 3))))
  const formattingScore = Math.max(35, 100 - missingSections.length * 10 - (resume.personal?.summary?.length > 1200 ? 10 : 0))
  return { strength, formattingScore, keywordMatch, missingSections, missingSkills, suggestions, analyzedAt: new Date(), engine: 'rules-v1' }
}

async function seedResume(userId, title, template) {
  const [user, studentProfile] = await Promise.all([
    User.findById(userId).select('name email phone').lean(),
    StudentProfile.findOne({ userId }).lean(),
  ])
  const portfolioBase = process.env.PUBLIC_WEB_URL || ''
  return {
    userId,
    title: text(title, 120) || 'Professional Resume',
    template: ['modern', 'classic', 'compact'].includes(template) ? template : 'modern',
    personal: {
      fullName: studentProfile?.displayName || user?.name || '',
      headline: studentProfile?.headline || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: studentProfile?.location || '',
      summary: studentProfile?.bio || '',
      portfolio: studentProfile?.username && portfolioBase ? `${portfolioBase.replace(/\/$/, '')}/students/${studentProfile.username}` : '',
      github: studentProfile?.links?.find((item) => /github/i.test(item.label))?.url || '',
      linkedin: studentProfile?.links?.find((item) => /linkedin/i.test(item.label))?.url || '',
    },
    education: studentProfile?.academic?.institution ? [{
      institution: studentProfile.academic.institution,
      degree: studentProfile.academic.course,
      field: studentProfile.academic.department,
      endDate: studentProfile.academic.year,
      cgpa: studentProfile.academic.cgpa ? String(studentProfile.academic.cgpa) : '',
    }] : [],
    skills: (studentProfile?.skills || []).map((item) => ({ name: item.name, category: item.type, level: item.proficiency })),
    projects: (studentProfile?.projects || []).map((item) => ({
      title: item.title, description: item.description, technologies: item.technologies,
      githubUrl: item.githubUrl, demoUrl: item.demoUrl,
    })),
    certifications: (studentProfile?.credentials || []).map((item) => ({
      title: item.title, issuer: item.issuer, issuedAt: item.issuedAt ? new Date(item.issuedAt).toISOString().slice(0, 10) : '',
      credentialId: item.credentialId, url: item.verificationUrl || item.documentUrl,
    })),
    achievements: (studentProfile?.achievements || []).map((item) => ({
      title: item.title, issuer: item.issuer, date: item.awardedAt ? new Date(item.awardedAt).toISOString().slice(0, 10) : '', description: item.description,
    })),
    languages: (studentProfile?.languages || []).map((name) => ({ name, proficiency: '' })),
  }
}

exports.getProfile = async (req, res) => {
  try {
    return res.json({ success: true, profile: await ensureCareerProfile(req.user._id) })
  } catch (error) {
    return fail(res, 500, 'Failed to load career profile')
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await ensureCareerProfile(req.user._id)
    if (req.body.revision && Number(req.body.revision) !== profile.revision) return fail(res, 409, 'Career profile changed in another session', 'REVISION_CONFLICT')
    Object.assign(profile, cleanCareerProfile(req.body))
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, profile })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to update career profile')
  }
}

exports.listResumes = async (req, res) => {
  try {
    const items = await Resume.find({ userId: req.user._id }).sort({ isDefault: -1, updatedAt: -1 }).lean()
    return res.json({ success: true, items })
  } catch (error) {
    return fail(res, 500, 'Failed to load resumes')
  }
}

exports.getResume = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    return res.json({ success: true, resume })
  } catch (error) {
    return fail(res, 500, 'Failed to load resume')
  }
}

exports.createResume = async (req, res) => {
  try {
    if (await Resume.countDocuments({ userId: req.user._id }) >= 10) return fail(res, 400, 'Maximum of 10 resumes reached', 'LIMIT_REACHED')
    const base = req.body.fromProfile === false
      ? { userId: req.user._id, title: text(req.body.title, 120) || 'Professional Resume', template: req.body.template || 'modern' }
      : await seedResume(req.user._id, req.body.title, req.body.template)
    const count = await Resume.countDocuments({ userId: req.user._id })
    const resume = new Resume({ ...base, ...cleanResume(req.body), isDefault: count === 0 || Boolean(req.body.isDefault) })
    resume.atsSnapshot = resumeAnalysis(resume)
    await resume.save()
    if (resume.isDefault) await Resume.updateMany({ userId: req.user._id, _id: { $ne: resume._id } }, { $set: { isDefault: false } })
    return res.status(201).json({ success: true, resume })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to create resume')
  }
}

exports.updateResume = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id })
    if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    if (req.body.revision && Number(req.body.revision) !== resume.revision) return fail(res, 409, 'Resume changed in another session', 'REVISION_CONFLICT')
    Object.assign(resume, cleanResume(req.body))
    resume.revision += 1
    resume.lastAutosavedAt = new Date()
    resume.atsSnapshot = resumeAnalysis(resume, req.body.keywords)
    if (req.body.isDefault === true) {
      resume.isDefault = true
      await Resume.updateMany({ userId: req.user._id, _id: { $ne: resume._id } }, { $set: { isDefault: false } })
    }
    await resume.save()
    return res.json({ success: true, resume })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to save resume')
  }
}

exports.deleteResume = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    if (resume.isDefault) {
      const next = await Resume.findOne({ userId: req.user._id }).sort('-updatedAt')
      if (next) { next.isDefault = true; await next.save() }
    }
    return res.json({ success: true })
  } catch (error) {
    return fail(res, 500, 'Failed to delete resume')
  }
}

exports.analyzeResume = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id })
    if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
    resume.atsSnapshot = resumeAnalysis(resume, req.body.keywords)
    await resume.save()
    return res.json({ success: true, analysis: resume.atsSnapshot, architecture: { aiReady: true, currentEngine: 'rules-v1', futureSignals: ['semantic keyword relevance', 'role-specific skill gaps', 'impact statement quality'] } })
  } catch (error) {
    return fail(res, 500, 'Failed to analyze resume')
  }
}

function sectionTitle(doc, title, color) {
  doc.moveDown(0.7).font('Helvetica-Bold').fontSize(11).fillColor(color).text(title.toUpperCase(), { characterSpacing: 1 })
  doc.moveDown(0.3).strokeColor(color).lineWidth(0.5).moveTo(doc.x, doc.y).lineTo(555, doc.y).stroke().moveDown(0.4)
}

function writeResumePdf(resume, res) {
  const colors = {
    modern: { accent: '#6D28D9', text: '#1F2937' },
    classic: { accent: '#111827', text: '#111827' },
    compact: { accent: '#0F766E', text: '#1F2937' },
  }
  const color = colors[resume.template] || colors.modern
  const doc = new PDFDocument({ size: 'A4', margin: resume.template === 'compact' ? 34 : 46, info: { Title: resume.title, Author: resume.personal?.fullName || 'Dream Wave Student' } })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${text(resume.title, 80).replace(/[^a-z0-9]+/gi, '-') || 'resume'}.pdf"`)
  doc.pipe(res)
  doc.font('Helvetica-Bold').fontSize(24).fillColor(color.accent).text(resume.personal?.fullName || 'Student Name')
  if (resume.personal?.headline) doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text(resume.personal.headline)
  const contacts = [resume.personal?.email, resume.personal?.phone, resume.personal?.location, resume.personal?.linkedin, resume.personal?.github, resume.personal?.portfolio].filter(Boolean)
  if (contacts.length) doc.moveDown(0.4).fontSize(8).fillColor('#4B5563').text(contacts.join('  •  '))
  if (resume.personal?.summary) { sectionTitle(doc, 'Professional Summary', color.accent); doc.font('Helvetica').fontSize(9).fillColor(color.text).text(resume.personal.summary, { lineGap: 2 }) }
  if (resume.skills?.length) { sectionTitle(doc, 'Skills', color.accent); doc.font('Helvetica').fontSize(9).fillColor(color.text).text(resume.skills.map((item) => item.name).join('  •  '), { lineGap: 2 }) }
  const groups = [
    ['Experience', resume.experience, (item) => [item.title, item.organization].filter(Boolean).join(' — ')],
    ['Internships', resume.internships, (item) => [item.title, item.organization].filter(Boolean).join(' — ')],
    ['Education', resume.education, (item) => [item.degree, item.field, item.institution].filter(Boolean).join(' — ')],
    ['Projects', resume.projects, (item) => item.title],
    ['Certifications', resume.certifications, (item) => [item.title, item.issuer].filter(Boolean).join(' — ')],
    ['Achievements', resume.achievements, (item) => [item.title, item.issuer].filter(Boolean).join(' — ')],
  ]
  groups.forEach(([title, items, heading]) => {
    if (!items?.length) return
    sectionTitle(doc, title, color.accent)
    items.forEach((item) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(color.text).text(heading(item))
      const dates = [item.startDate || item.issuedAt || item.date, item.current ? 'Present' : item.endDate].filter(Boolean).join(' – ')
      if (dates) doc.font('Helvetica-Oblique').fontSize(8).fillColor('#6B7280').text(dates)
      if (item.description) doc.font('Helvetica').fontSize(8.5).fillColor(color.text).text(item.description, { lineGap: 1 })
      if (item.highlights?.length) item.highlights.forEach((line) => doc.font('Helvetica').fontSize(8.5).text(`• ${line}`))
      if (item.technologies?.length) doc.font('Helvetica-Oblique').fontSize(8).fillColor('#6B7280').text(`Technologies: ${item.technologies.join(', ')}`)
      doc.moveDown(0.35)
    })
  })
  if (resume.languages?.length) { sectionTitle(doc, 'Languages', color.accent); doc.font('Helvetica').fontSize(9).fillColor(color.text).text(resume.languages.map((item) => `${item.name}${item.proficiency ? ` (${item.proficiency})` : ''}`).join('  •  ')) }
  if (resume.references?.length) { sectionTitle(doc, 'References', color.accent); resume.references.forEach((item) => doc.font('Helvetica').fontSize(8.5).fillColor(color.text).text([item.name, item.relationship, item.organization, item.email, item.phone].filter(Boolean).join(' • '))) }
  doc.end()
}

exports.downloadResume = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id })
  if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
  return writeResumePdf(resume, res)
}

exports.publicResume = async (req, res) => {
  const token = text(req.params.token, 64)
  if (!/^[a-f0-9]{48}$/.test(token)) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
  const resume = await Resume.findOne({ shareToken: token, status: { $ne: 'archived' } }).select('+shareToken')
  if (!resume) return fail(res, 404, 'Resume not found', 'NOT_FOUND')
  res.setHeader('Cache-Control', 'private, no-store')
  return writeResumePdf(resume, res)
}

async function visibleCompanyIds(industry, company) {
  const query = { status: 'approved', isPublic: true }
  if (industry) query.industry = new RegExp(`^${escapeRegex(industry)}$`, 'i')
  if (company) query.$or = [{ name: new RegExp(escapeRegex(company), 'i') }, { slug: new RegExp(escapeRegex(company), 'i') }]
  return CompanyProfile.find(query).distinct('_id')
}

exports.getOpportunities = async (req, res) => {
  try {
    const type = req.query.type === 'internship' ? 'internship' : 'job'
    const Model = type === 'job' ? Job : Internship
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 20))
    const companyIds = await visibleCompanyIds(req.query.industry, req.query.company)
    const query = { status: 'open', companyId: { $in: companyIds }, $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: new Date() } }] }
    if (req.query.q) {
      const regex = new RegExp(escapeRegex(req.query.q), 'i')
      query.$and = [{ $or: [{ title: regex }, { description: regex }, { skills: regex }, { category: regex }] }]
    }
    if (req.query.location) query.location = new RegExp(escapeRegex(req.query.location), 'i')
    if (req.query.workMode) query.workMode = req.query.workMode
    if (req.query.skill) query.skills = new RegExp(escapeRegex(req.query.skill), 'i')
    if (type === 'job') {
      if (req.query.jobType) query.type = req.query.jobType
      if (req.query.minSalary) query.salaryMax = { $gte: Math.max(0, Number(req.query.minSalary) || 0) }
      if (req.query.experience) query.experience = new RegExp(escapeRegex(req.query.experience), 'i')
    }
    const [items, total, bookmarks] = await Promise.all([
      Model.find(query).populate('companyId', 'name slug logo industry companySize verified careers culture benefits contact website').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(query),
      Bookmark.find({ studentId: req.user._id, targetType: type }).select('targetId').lean(),
    ])
    const saved = new Set(bookmarks.map((item) => String(item.targetId)))
    return res.json({ success: true, type, items: items.map((item) => ({ ...item, saved: saved.has(String(item._id)) })), total, page, limit })
  } catch (error) {
    console.error('[career.opportunities]', error.message)
    return fail(res, 500, 'Failed to load opportunities')
  }
}

exports.getOpportunityFilters = async (req, res) => {
  try {
    const companyIds = await visibleCompanyIds()
    const [jobLocations, internshipLocations, jobSkills, internshipSkills, industries, companies] = await Promise.all([
      Job.distinct('location', { companyId: { $in: companyIds }, status: 'open' }),
      Internship.distinct('location', { companyId: { $in: companyIds }, status: 'open' }),
      Job.distinct('skills', { companyId: { $in: companyIds }, status: 'open' }),
      Internship.distinct('skills', { companyId: { $in: companyIds }, status: 'open' }),
      CompanyProfile.distinct('industry', { _id: { $in: companyIds } }),
      CompanyProfile.find({ _id: { $in: companyIds } }).select('name slug logo industry').sort('name').limit(500).lean(),
    ])
    return res.json({ success: true, options: {
      locations: [...new Set([...jobLocations, ...internshipLocations].filter(Boolean))].sort(),
      skills: [...new Set([...jobSkills, ...internshipSkills].filter(Boolean))].sort(),
      industries: industries.filter(Boolean).sort(),
      companies,
      workModes: ['onsite', 'remote', 'hybrid'],
      jobTypes: ['full-time', 'part-time', 'contract', 'remote', 'graduate', 'apprenticeship', 'campus'],
    } })
  } catch (error) {
    return fail(res, 500, 'Failed to load opportunity filters')
  }
}

exports.apply = async (req, res) => {
  try {
    const type = req.params.type
    if (!['job', 'internship'].includes(type) || !validId(req.params.id)) return fail(res, 404, 'Opportunity not found', 'NOT_FOUND')
    const Model = type === 'job' ? Job : Internship
    const opportunity = await Model.findOne({ _id: req.params.id, status: 'open', $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: new Date() } }] })
    if (!opportunity) return fail(res, 404, 'Opportunity not found', 'NOT_FOUND')
    const company = await CompanyProfile.findOne({ _id: opportunity.companyId, status: 'approved', isPublic: true })
    if (!company) return fail(res, 404, 'Opportunity not found', 'NOT_FOUND')
    if (await Application.exists({ studentId: req.user._id, targetType: type, targetId: opportunity._id })) return fail(res, 409, 'You already applied to this opportunity', 'ALREADY_APPLIED')
    let resume = null
    if (req.body.resumeId) {
      if (!validId(req.body.resumeId)) return fail(res, 400, 'Invalid resume', 'VALIDATION_ERROR')
      resume = await Resume.findOne({ _id: req.body.resumeId, userId: req.user._id, status: { $ne: 'archived' } }).select('+shareToken')
    } else resume = await Resume.findOne({ userId: req.user._id, isDefault: true, status: { $ne: 'archived' } }).select('+shareToken')
    if (!resume) return fail(res, 400, 'Create or select a resume before applying', 'RESUME_REQUIRED')
    const baseUrl = process.env.PUBLIC_API_URL || ''
    const resumeUrl = `${baseUrl.replace(/\/$/, '')}/api/career/public/resumes/${resume.shareToken}.pdf`
    const application = await Application.create({
      studentId: req.user._id,
      companyId: company._id,
      targetType: type,
      targetId: opportunity._id,
      coverLetter: text(req.body.coverLetter, 5000),
      resumeId: resume._id,
      resumeUrl,
      status: 'pending',
      statusHistory: [{ status: 'pending', note: 'Application submitted' }],
    })
    await Promise.all([
      Model.updateOne({ _id: opportunity._id }, { $inc: { applicationsCount: 1 } }),
      CompanyProfile.updateOne({ _id: company._id }, { $inc: { 'stats.applications': 1 } }),
    ])
    return res.status(201).json({ success: true, application })
  } catch (error) {
    if (error.code === 11000) return fail(res, 409, 'You already applied to this opportunity', 'ALREADY_APPLIED')
    return fail(res, 500, 'Failed to submit application')
  }
}

async function enrichedApplications(userId) {
  const applications = await Application.find({ studentId: userId, targetType: { $in: ['job', 'internship'] } }).sort('-updatedAt').limit(200).lean()
  const jobIds = applications.filter((item) => item.targetType === 'job').map((item) => item.targetId)
  const internshipIds = applications.filter((item) => item.targetType === 'internship').map((item) => item.targetId)
  const [jobs, internships, companies] = await Promise.all([
    Job.find({ _id: { $in: jobIds } }).lean(),
    Internship.find({ _id: { $in: internshipIds } }).lean(),
    CompanyProfile.find({ _id: { $in: applications.map((item) => item.companyId).filter(Boolean) } }).select('name slug logo industry').lean(),
  ])
  const targets = new Map([...jobs, ...internships].map((item) => [String(item._id), item]))
  const companyMap = new Map(companies.map((item) => [String(item._id), item]))
  return applications.map((item) => ({ ...item, opportunity: targets.get(String(item.targetId)) || null, company: companyMap.get(String(item.companyId)) || null }))
}

exports.getApplications = async (req, res) => {
  try {
    return res.json({ success: true, items: await enrichedApplications(req.user._id) })
  } catch (error) {
    return fail(res, 500, 'Failed to load applications')
  }
}

exports.withdrawApplication = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Application not found', 'NOT_FOUND')
    const application = await Application.findOne({ _id: req.params.id, studentId: req.user._id })
    if (!application) return fail(res, 404, 'Application not found', 'NOT_FOUND')
    if (['accepted', 'rejected', 'withdrawn'].includes(application.status)) return fail(res, 409, 'This application can no longer be withdrawn', 'INVALID_TRANSITION')
    application.status = 'withdrawn'
    application.statusHistory.push({ status: 'withdrawn', note: 'Withdrawn by student' })
    await application.save()
    return res.json({ success: true, application })
  } catch (error) {
    return fail(res, 500, 'Failed to withdraw application')
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const profile = await ensureCareerProfile(req.user._id)
    const companyIds = await visibleCompanyIds()
    const [studentProfile, resumes, applications, jobsAvailable, internshipsAvailable, bookmarks] = await Promise.all([
      StudentProfile.findOne({ userId: req.user._id }).lean(),
      Resume.find({ userId: req.user._id, status: { $ne: 'archived' } }).sort({ isDefault: -1, updatedAt: -1 }).lean(),
      enrichedApplications(req.user._id),
      Job.countDocuments({ companyId: { $in: companyIds }, status: 'open', $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: new Date() } }] }),
      Internship.countDocuments({ companyId: { $in: companyIds }, status: 'open', $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: new Date() } }] }),
      Bookmark.countDocuments({ studentId: req.user._id, targetType: { $in: ['job', 'internship'] } }),
    ])
    const defaultResume = resumes.find((item) => item.isDefault) || resumes[0]
    const profileSignals = [
      studentProfile?.displayName, studentProfile?.headline, studentProfile?.bio,
      studentProfile?.academic?.institution, studentProfile?.skills?.length >= 3,
      studentProfile?.projects?.length > 0, profile.targetCareer || profile.targetRoles?.length,
    ]
    const profileCompletion = Math.round(profileSignals.filter(Boolean).length / profileSignals.length * 100)
    const submitted = applications.length
    const interviewInvitations = applications.filter((item) => item.status === 'interview').length
    const offers = applications.filter((item) => item.status === 'accepted').length
    const careerProgress = Math.round(profileCompletion * .35 + (defaultResume?.atsSnapshot?.strength || 0) * .4 + Math.min(25, submitted * 5))
    return res.json({ success: true, dashboard: {
      profileCompletion,
      resumeScore: defaultResume?.atsSnapshot?.strength || 0,
      applicationsSubmitted: submitted,
      interviewInvitations,
      internshipsAvailable,
      jobsAvailable,
      savedOpportunities: bookmarks,
      careerProgress: Math.min(100, careerProgress),
      offers,
      defaultResume: defaultResume ? { _id: defaultResume._id, title: defaultResume.title, updatedAt: defaultResume.updatedAt } : null,
      applications: applications.slice(0, 6),
      profile,
    } })
  } catch (error) {
    console.error('[career.dashboard]', error.message)
    return fail(res, 500, 'Failed to load career dashboard')
  }
}

exports.getNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ userId: req.user._id, type: { $in: ['job', 'internship'] } }).sort('-createdAt').limit(50).lean()
    return res.json({ success: true, items, unread: items.filter((item) => !item.read).length })
  } catch (error) {
    return fail(res, 500, 'Failed to load career notifications')
  }
}

exports.getReadiness = async (req, res) => {
  try {
    const [profile, studentProfile, resume, applications] = await Promise.all([
      ensureCareerProfile(req.user._id),
      StudentProfile.findOne({ userId: req.user._id }).lean(),
      Resume.findOne({ userId: req.user._id, isDefault: true }).lean(),
      Application.find({ studentId: req.user._id, targetType: { $in: ['job', 'internship'] } }).select('status').lean(),
    ])
    const ownedSkills = (studentProfile?.skills || []).map((item) => item.name)
    const required = profile.requiredSkills || []
    const missing = required.filter((skill) => !ownedSkills.some((item) => item.toLowerCase() === skill.toLowerCase()))
    const skillProgress = required.length ? Math.round((required.length - missing.length) / required.length * 100) : 0
    const resumeStatus = resume ? { exists: true, strength: resume.atsSnapshot?.strength || 0, updatedAt: resume.updatedAt } : { exists: false, strength: 0 }
    const placementReadiness = Math.round(skillProgress * .45 + resumeStatus.strength * .4 + Math.min(15, applications.length * 3))
    return res.json({ success: true, roadmap: {
      targetCareer: profile.targetCareer || profile.targetRoles?.[0] || '',
      requiredSkills: required,
      currentSkills: ownedSkills,
      missingSkills: missing,
      learningProgress: skillProgress,
      resumeStatus,
      placementReadiness: Math.min(100, placementReadiness),
      architecture: { aiReady: true, futureInputs: ['career recommendations', 'skill-gap sequencing', 'market demand signals'] },
    }, interviews: {
      invitations: applications.filter((item) => item.status === 'interview').length,
      modules: [
        { id: 'technical', label: 'Technical Questions', availability: 'architecture-ready' },
        { id: 'hr', label: 'HR Questions', availability: 'architecture-ready' },
        { id: 'behavioral', label: 'Behavioral Questions', availability: 'architecture-ready' },
        { id: 'mock', label: 'Mock Interviews', availability: 'architecture-ready' },
      ],
    } })
  } catch (error) {
    return fail(res, 500, 'Failed to load placement readiness')
  }
}
