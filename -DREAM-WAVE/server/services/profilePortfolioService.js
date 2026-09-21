const crypto = require('crypto')

const text = (value, max) => String(value || '').trim().slice(0, max)

function visibleItems(items = []) {
  return (items || []).filter((item) => item.visibility === 'public')
}

function orderByIds(items, ids = [], featuredIds = []) {
  const featuredSet = new Set((featuredIds || []).map(String))
  const orderMap = Object.fromEntries((ids || []).map((id, index) => [String(id), index]))
  return [...items].sort((a, b) => {
    const aFeatured = featuredSet.has(String(a._id)) ? 0 : 1
    const bFeatured = featuredSet.has(String(b._id)) ? 0 : 1
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
    const aOrder = orderMap[String(a._id)]
    const bOrder = orderMap[String(b._id)]
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1
    return (a.sortOrder || 0) - (b.sortOrder || 0) || new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  })
}

function computeCompleteness(profile) {
  const checks = [
    { key: 'photo', label: 'Profile photo', done: Boolean(profile.profilePhoto) },
    { key: 'about', label: 'About section', done: Boolean(profile.bio && profile.bio.length >= 40) },
    { key: 'headline', label: 'Professional headline', done: Boolean(profile.headline) },
    { key: 'education', label: 'Academic journey', done: Boolean(profile.academicJourney?.length || profile.academic?.institution) },
    { key: 'skills', label: 'Public skills', done: (profile.skills || []).some((item) => item.visibility === 'public') },
    { key: 'project', label: 'Public project', done: (profile.projects || []).some((item) => item.visibility === 'public') },
    { key: 'certificate', label: 'Public certificate', done: (profile.credentials || []).some((item) => item.visibility === 'public') },
    { key: 'career', label: 'Career direction', done: Boolean(profile.careerDirection?.targetRole) },
  ]
  const completed = checks.filter((item) => item.done).length
  return {
    percent: Math.round((completed / checks.length) * 100),
    checks,
  }
}

function buildRecommendations(profile) {
  const recommendations = []
  const completeness = computeCompleteness(profile)
  for (const check of completeness.checks.filter((item) => !item.done)) {
    recommendations.push({
      type: 'completeness',
      title: check.label,
      message: `Add your ${check.label.toLowerCase()} to strengthen your digital identity.`,
      priority: 'normal',
    })
  }
  const publicProjects = (profile.projects || []).filter((item) => item.visibility === 'public')
  if (publicProjects.length && !publicProjects.some((item) => item.featured)) {
    recommendations.push({
      type: 'portfolio',
      title: 'Feature a project',
      message: 'Choose one completed project to highlight on your portfolio.',
      priority: 'normal',
    })
  }
  const publicSkills = (profile.skills || []).filter((item) => item.visibility === 'public')
  const projectTech = new Set(publicProjects.flatMap((item) => item.technologies || []).map((value) => value.toLowerCase()))
  for (const skill of publicSkills) {
    if (!projectTech.has(String(skill.name).toLowerCase())) {
      recommendations.push({
        type: 'evidence',
        title: `Evidence for ${skill.name}`,
        message: `Consider linking a project that uses ${skill.name}.`,
        priority: 'low',
      })
      break
    }
  }
  return recommendations.slice(0, 8)
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function findDuplicateCredential(profile, { credentialId, verificationUrl, title, issuer, issuedAt, fileHash }) {
  return (profile.credentials || []).find((item) => {
    if (fileHash && item.fileHash && item.fileHash === fileHash) return true
    if (credentialId && item.credentialId && item.credentialId === credentialId) return true
    if (verificationUrl && item.verificationUrl && item.verificationUrl === verificationUrl) return true
    if (title && issuer && issuedAt && item.title === title && item.issuer === issuer) {
      const a = item.issuedAt ? new Date(item.issuedAt).toISOString().slice(0, 10) : ''
      const b = issuedAt ? new Date(issuedAt).toISOString().slice(0, 10) : ''
      if (a && b && a === b) return true
    }
    return false
  })
}

function buildPublicPortfolioDTO(profile, user, { summary, graph } = {}) {
  const visible = visibleItems
  const portfolioConfig = profile.portfolio || {}
  const sections = portfolioConfig.sections || {}
  const person = {
    username: profile.username,
    displayName: profile.displayName || user.name,
    profilePhoto: profile.profilePhoto,
    coverBanner: profile.coverBanner,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    languages: profile.languages,
    links: profile.privacy.showLinks === false ? [] : profile.links,
    ...(profile.privacy.showEmail ? { email: user.email } : {}),
    ...(profile.privacy.showPhone ? { phone: user.phone } : {}),
  }
  const projects = orderByIds(
    visible(profile.projects),
    portfolioConfig.projectOrder,
    portfolioConfig.featuredProjectIds,
  )
  const credentials = orderByIds(
    visible(profile.credentials),
    [],
    portfolioConfig.featuredCredentialIds,
  )
  const achievements = orderByIds(
    visible(profile.achievements),
    [],
    portfolioConfig.featuredAchievementIds,
  )
  const title = `${person.displayName} | Dream Wave Portfolio`
  const description = (profile.headline || profile.bio || `${person.displayName}'s learning portfolio`).slice(0, 160)
  return {
    schemaVersion: 'student-portfolio-v2',
    updatedAt: profile.updatedAt,
    seo: {
      title,
      description,
      image: profile.profilePhoto,
      robots: profile.privacy.visibility === 'public' && profile.privacy.discoverable ? 'index,follow' : 'noindex,nofollow',
    },
    person,
    portfolioIntro: portfolioConfig.intro || '',
    sectionOrder: profile.sectionOrder || [],
    sections,
    academic: profile.privacy.showAcademic ? profile.academic : undefined,
    academicJourney: profile.privacy.showAcademic ? visible(profile.academicJourney) : [],
    skills: profile.privacy.showSkills ? visible(profile.skills) : [],
    projects: profile.privacy.showProjects ? projects : [],
    achievements: profile.privacy.showAchievements ? achievements : [],
    credentials: profile.privacy.showCredentials ? credentials : [],
    experience: profile.privacy.showExperience ? visible(profile.experience) : [],
    careerDirection: profile.privacy.showCareer && profile.careerDirection?.visibility === 'public'
      ? {
        targetRole: profile.careerDirection.targetRole,
        interests: profile.careerDirection.interests || [],
      }
      : undefined,
    learning: profile.privacy.showLearning ? summary : undefined,
    graph,
    completeness: computeCompleteness(profile),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: person.displayName,
        description,
        image: person.profilePhoto || undefined,
        sameAs: (person.links || []).map((item) => item.url),
        knowsAbout: visible(profile.skills).map((item) => item.name),
      },
    },
  }
}

function cleanPortfolioPayload(body) {
  const payload = {}
  if (body.intro !== undefined) payload['portfolio.intro'] = text(body.intro, 2000)
  if (body.sectionOrder !== undefined && Array.isArray(body.sectionOrder)) {
    payload.sectionOrder = body.sectionOrder.slice(0, 20).map((item) => text(item, 40)).filter(Boolean)
  }
  if (body.featuredProjectIds !== undefined && Array.isArray(body.featuredProjectIds)) {
    payload['portfolio.featuredProjectIds'] = body.featuredProjectIds.slice(0, 12).map((id) => String(id))
  }
  if (body.featuredCredentialIds !== undefined && Array.isArray(body.featuredCredentialIds)) {
    payload['portfolio.featuredCredentialIds'] = body.featuredCredentialIds.slice(0, 12).map((id) => String(id))
  }
  if (body.featuredAchievementIds !== undefined && Array.isArray(body.featuredAchievementIds)) {
    payload['portfolio.featuredAchievementIds'] = body.featuredAchievementIds.slice(0, 12).map((id) => String(id))
  }
  if (body.projectOrder !== undefined && Array.isArray(body.projectOrder)) {
    payload['portfolio.projectOrder'] = body.projectOrder.slice(0, 50).map((id) => String(id))
  }
  if (body.sections && typeof body.sections === 'object') {
    const allowed = ['about', 'academic', 'skills', 'projects', 'credentials', 'achievements', 'experience', 'career']
    for (const key of allowed) {
      if (body.sections[key] !== undefined) payload[`portfolio.sections.${key}`] = Boolean(body.sections[key])
    }
  }
  if (body.careerDirection && typeof body.careerDirection === 'object') {
    payload.careerDirection = {
      targetRole: text(body.careerDirection.targetRole, 120),
      interests: Array.isArray(body.careerDirection.interests)
        ? body.careerDirection.interests.slice(0, 12).map((item) => text(item, 80)).filter(Boolean)
        : undefined,
      visibility: ['private', 'unlisted', 'public'].includes(body.careerDirection.visibility)
        ? body.careerDirection.visibility
        : undefined,
    }
  }
  return payload
}

module.exports = {
  text,
  visibleItems,
  orderByIds,
  computeCompleteness,
  buildRecommendations,
  hashBuffer,
  findDuplicateCredential,
  buildPublicPortfolioDTO,
  cleanPortfolioPayload,
}
