/**
 * Data-driven plan catalog (DW-ARCH-005).
 * User.plan stores the assignment; this file defines entitlements.
 * Stripe will later map price IDs → plan ids via an adapter (see docs/BILLING_STRIPE_ADAPTER.md).
 */
const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
};

const PLAN_CATALOG = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyCredits: 100,
    maxUploadMb: 25,
    features: {
      aiChat: true,
      aiModes: true,
      documents: true,
      community: true,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyCredits: 1000,
    maxUploadMb: 50,
    features: {
      aiChat: true,
      aiModes: true,
      documents: true,
      community: true,
      prioritySupport: true,
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyCredits: 5000,
    maxUploadMb: 100,
    features: {
      aiChat: true,
      aiModes: true,
      documents: true,
      community: true,
      prioritySupport: true,
    },
  },
};

function getPlan(planId) {
  return PLAN_CATALOG[planId] || PLAN_CATALOG.free;
}

function listPlans() {
  return Object.values(PLAN_CATALOG);
}

module.exports = { PLANS, PLAN_CATALOG, getPlan, listPlans };
