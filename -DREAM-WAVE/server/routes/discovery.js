const express = require('express');
const router = express.Router();
const dc = require('../controllers/discoveryController');
const { optionalAuth } = require('../middleware/roleGuard');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { resolveOrganization } = require('../middleware/resolveOrganization');
const rec = require('../controllers/recommendationController');

// ── Public / student discovery (integration-v1) ────────────────────────────────
router.get('/home', optionalAuth, dc.getHome);
router.get('/feed', dc.getFeed);
router.get('/featured', dc.getFeatured);
router.get('/promotions/:id', dc.getPromotion);
router.get('/recommendations', auth, rec.getRecommendations);

// ── Institution ↔ Company partnership discovery (feature/ui-threejs) ───────────
router.get('/companies', auth, requireRole('institution'), resolveOrganization, dc.searchCompanies);
router.get('/companies/:id', auth, requireRole('institution'), resolveOrganization, dc.getCompany);
router.get('/institutions', auth, requireRole('company'), resolveOrganization, dc.searchInstitutions);
router.get('/institutions/:id', auth, requireRole('company'), resolveOrganization, dc.getInstitution);

module.exports = router;
