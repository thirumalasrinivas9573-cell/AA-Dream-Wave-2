/**
 * Email notification channel — reuses existing auth email pattern.
 * Sends only when EMAIL_NOTIFICATIONS_ENABLED=true and user prefs allow.
 * Does not replace in-app notifications.
 */

const UserProfile = require('../models/UserProfile')

const IMPORTANT_TYPES = new Set([
  'recruitment_offer_released',
  'recruitment_interview_scheduled',
  'recruitment_interview_rescheduled',
  'placement_offer_released',
  'placement_interview_scheduled',
  'security_alert',
  'alumni_career_application_updated',
])

async function shouldSendEmail(recipientUserId, type) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true') return false
  if (!IMPORTANT_TYPES.has(type)) return false
  const profile = await UserProfile.findOne({ userId: recipientUserId }).select('notifications').lean()
  if (profile?.notifications?.emailEnabled === false) return false
  return true
}

async function sendEmailNotification({ recipientUserId, type, title, body }) {
  const allowed = await shouldSendEmail(recipientUserId, type)
  if (!allowed) return { sent: false, reason: 'email_disabled_or_not_important' }
  // Provider not configured — log only (same pattern as auth OTP)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[email-notification] to=${recipientUserId} type=${type} title=${title}`)
  }
  return { sent: false, reason: 'email_provider_not_configured', logged: true }
}

module.exports = { sendEmailNotification, shouldSendEmail, IMPORTANT_TYPES }
