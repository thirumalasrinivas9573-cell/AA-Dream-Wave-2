import { plannerApi } from '@shared/services/api'

const plannerService = {
  getToday: (date) => plannerApi.getToday(date ? { date } : undefined).then((r) => r.data),
  getWeek: (start) => plannerApi.getWeek(start ? { start } : undefined).then((r) => r.data),
  getPreferences: () => plannerApi.getPreferences().then((r) => r.data.preferences),
  updatePreferences: (data) => plannerApi.updatePreferences(data).then((r) => r.data.preferences),
  suggestDaily: (data) => plannerApi.suggestDaily(data).then((r) => r.data.preview),
  suggestWeekly: (data) => plannerApi.suggestWeekly(data).then((r) => r.data.preview),
  applyPlan: (items, mode = 'selected') => plannerApi.applyPlan({ items, mode }).then((r) => r.data),
  completeSchedule: (id, markTaskComplete) => plannerApi.completeSchedule(id, { markTaskComplete }).then((r) => r.data),
  skipSchedule: (id) => plannerApi.skipSchedule(id).then((r) => r.data),
  createSchedule: (data) => plannerApi.createSchedule(data).then((r) => r.data),
  reschedule: (id, data) => plannerApi.updateSchedule(id, data).then((r) => r.data),
  getMetrics: () => plannerApi.getMetrics().then((r) => r.data.metrics),
  getDailySummary: (date) => plannerApi.getDailySummary(date ? { date } : undefined).then((r) => r.data.summary),
  getOverdue: () => plannerApi.getOverdue().then((r) => r.data.overdue),
  getActiveFocus: () => plannerApi.getActiveFocus().then((r) => r.data.session),
  getFocusHistory: (params) => plannerApi.getFocusHistory(params).then((r) => r.data),
  startFocus: (data) => plannerApi.startFocus(data).then((r) => r.data),
  pauseFocus: (id) => plannerApi.pauseFocus(id).then((r) => r.data),
  resumeFocus: (id) => plannerApi.resumeFocus(id).then((r) => r.data),
  completeFocus: (id, data) => plannerApi.completeFocus(id, data).then((r) => r.data),
  cancelFocus: (id) => plannerApi.cancelFocus(id).then((r) => r.data),
  suggestBreakdown: (taskId) => plannerApi.suggestBreakdown(taskId).then((r) => r.data),
}

export default plannerService
