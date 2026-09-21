const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { publicBilling } = require('../services/entitlements');
const stripeService = require('../services/stripeService');
const { auditFromRequest } = require('../utils/audit');

exports.getPlan = asyncHandler(async (req, res) => {
  res.json({ success: true, data: publicBilling(req.user) });
});

exports.createCheckout = asyncHandler(async (req, res) => {
  const planId = String(req.body.plan || '').toLowerCase();
  const { url, id } = await stripeService.createCheckoutSession(req.user, planId);
  await auditFromRequest(req, {
    action: 'billing.checkout',
    resource: 'billing',
    resourceId: id,
    meta: { planId },
  });
  res.json({ success: true, data: { url, id } });
});

exports.createPortal = asyncHandler(async (req, res) => {
  const { url } = await stripeService.createPortalSession(req.user);
  await auditFromRequest(req, {
    action: 'billing.portal',
    resource: 'billing',
  });
  res.json({ success: true, data: { url } });
});

/** Mounted with express.raw — req.body is a Buffer */
exports.webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  const result = await stripeService.constructAndHandleWebhook(rawBody, signature);
  res.json({ success: true, ...result });
});
