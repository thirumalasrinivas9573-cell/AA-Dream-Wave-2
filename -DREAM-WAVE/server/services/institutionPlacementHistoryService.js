const InstitutionStudent = require('../models/InstitutionStudent')

async function recordStudentPlacementStatus(studentId, status, actorUserId, source = 'institution') {
  const student = await InstitutionStudent.findById(studentId)
  if (!student) return
  student.placement = student.placement || {}
  student.placement.statusHistory = student.placement.statusHistory || []
  student.placement.statusHistory.push({
    status,
    source,
    actorUserId: actorUserId || null,
    at: new Date(),
  })
  if (['joined', 'offer_accepted'].includes(status)) student.placement.lifecycleStatus = 'PLACED'
  else if (status === 'applied') student.placement.lifecycleStatus = 'APPLYING'
  await student.save()
}

module.exports = {
  recordStudentPlacementStatus,
}
