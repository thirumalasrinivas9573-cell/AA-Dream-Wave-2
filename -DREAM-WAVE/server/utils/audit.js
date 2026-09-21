const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

async function writeAudit({ organizationId, actor, action, resource, resourceId, meta, ip, requestId }) {
  try {
    await AuditLog.create({
      organizationId: organizationId || null,
      actor: actor || null,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : '',
      meta: {
        ...(meta || {}),
        ...(requestId ? { requestId } : {}),
      },
      ip: ip || '',
    });
  } catch (err) {
    logger.warn('Audit write failed', { error: err.message, action, resource });
  }
}

function clientIp(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

async function auditFromRequest(req, { action, resource, resourceId, meta, organizationId }) {
  return writeAudit({
    organizationId: organizationId || req.user?.organizationId || null,
    actor: req.user?._id || null,
    action,
    resource,
    resourceId,
    meta,
    ip: clientIp(req),
    requestId: req.requestId,
  });
}

module.exports = { writeAudit, auditFromRequest, clientIp };
