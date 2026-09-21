const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const nc = require('../controllers/notificationController');

router.use(auth);
router.get('/', nc.listMine);
router.patch('/read-all', nc.markAllRead);
router.patch('/:id/read', nc.markRead);
router.patch('/:id/archive', nc.archive);
router.patch('/:id/restore', nc.restore);
router.patch('/:id/pin', nc.pin);
router.patch('/:id/priority', nc.setPriority);
router.delete('/:id', nc.remove);
router.post('/', requireRole('admin'), nc.create);

module.exports = router;
