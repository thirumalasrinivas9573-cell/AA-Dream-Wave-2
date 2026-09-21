const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function pad2(value) {
  return String(value).padStart(2, '0')
}

function dateKeyFromDate(date = new Date()) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseDateKey(key) {
  if (!key || typeof key !== 'string') return null
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = String(timeStr || '09:00').split(':').map(Number)
  const total = (h * 60) + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${pad2(nh)}:${pad2(nm)}`
}

function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number)
  return (h * 60) + m
}

function minutesBetweenTimes(start, end) {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  return e >= s ? e - s : (24 * 60 - s) + e
}

function overlaps(a, b) {
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) return false
  if (a.scheduledDate !== b.scheduledDate) return false
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

function detectConflicts(items, candidate) {
  const conflicts = []
  for (const item of items) {
    if (candidate._id && String(item._id) === String(candidate._id)) continue
    if (item.status === 'cancelled' || item.status === 'skipped') continue
    if (overlaps(item, candidate)) conflicts.push(item)
    if (candidate.taskId && item.taskId && String(item.taskId) === String(candidate.taskId)
      && item.scheduledDate === candidate.scheduledDate
      && item.status !== 'cancelled') {
      conflicts.push(item)
    }
  }
  return [...new Map(conflicts.map((c) => [String(c._id || `${c.taskId}-${c.scheduledDate}`), c])).values()]
}

function validateTimeBlock({ scheduledDate, startTime, endTime, durationMinutes }) {
  const errors = []
  const date = parseDateKey(scheduledDate)
  if (!date) errors.push('Invalid scheduled date.')
  if (startTime && endTime) {
    const duration = minutesBetweenTimes(startTime, endTime)
    if (duration <= 0) errors.push('End time must be after start time.')
    if (durationMinutes && Math.abs(duration - durationMinutes) > 5) {
      errors.push('Duration does not match start/end times.')
    }
  }
  if (durationMinutes != null && (durationMinutes < 1 || durationMinutes > 24 * 60)) {
    errors.push('Duration must be between 1 and 1440 minutes.')
  }
  const todayKey = dateKeyFromDate(new Date())
  if (scheduledDate < todayKey && date) {
    const now = new Date()
    if (startTime && scheduledDate === todayKey) {
      const blockStart = new Date(date)
      const [h, m] = startTime.split(':').map(Number)
      blockStart.setHours(h, m, 0, 0)
      if (blockStart < now) errors.push('Cannot schedule in the past.')
    } else if (scheduledDate < todayKey) {
      errors.push('Cannot schedule on a past date.')
    }
  }
  return errors
}

function sumPlannedMinutes(items) {
  return items
    .filter((item) => !['cancelled', 'skipped', 'completed'].includes(item.status))
    .reduce((sum, item) => sum + (item.durationMinutes || 0), 0)
}

function detectOverload(plannedMinutes, availableMinutes) {
  if (!availableMinutes || availableMinutes <= 0) return null
  if (plannedMinutes <= availableMinutes) return null
  return {
    plannedMinutes,
    availableMinutes,
    excessMinutes: plannedMinutes - availableMinutes,
    message: `Your planned workload (${plannedMinutes} min) exceeds available study time (${availableMinutes} min).`,
  }
}

function weekStartKey(date = new Date()) {
  const d = startOfDay(date)
  d.setDate(d.getDate() - d.getDay())
  return dateKeyFromDate(d)
}

function weekDateKeys(startKey) {
  const start = parseDateKey(startKey)
  if (!start) return []
  return Array.from({ length: 7 }, (_, i) => dateKeyFromDate(addDays(start, i)))
}

function dayKeyFromDate(date) {
  return DAY_KEYS[new Date(date).getDay()]
}

function defaultStartTime(preferences) {
  const map = { morning: '08:00', afternoon: '14:00', evening: '18:00', night: '20:00', flexible: '17:00' }
  return map[preferences?.preferredStudyTime] || '17:00'
}

module.exports = {
  DAY_KEYS,
  dateKeyFromDate,
  parseDateKey,
  startOfDay,
  endOfDay,
  addDays,
  addMinutesToTime,
  timeToMinutes,
  minutesBetweenTimes,
  overlaps,
  detectConflicts,
  validateTimeBlock,
  sumPlannedMinutes,
  detectOverload,
  weekStartKey,
  weekDateKeys,
  dayKeyFromDate,
  defaultStartTime,
  pad2,
}
