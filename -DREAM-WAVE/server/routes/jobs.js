const express = require('express');
const jobs = require('../controllers/companyJobsController');
const { protect } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const { z } = require('zod');

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
});

const router = express.Router();

router.get('/categories', protect, jobs.listCategories);
router.get('/', protect, jobs.listPublishedJobs);
router.get('/my-applications', protect, jobs.myApplications);
router.get('/:jobId', protect, jobs.getPublishedJob);
router.post('/:jobId/apply', protect, zodValidate(applySchema), jobs.applyToJob);
router.post('/applications/:applicationId/withdraw', protect, jobs.withdrawApplication);

module.exports = router;
