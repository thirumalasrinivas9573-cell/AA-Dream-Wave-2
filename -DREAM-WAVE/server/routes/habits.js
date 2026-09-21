const express = require('express');
const ctrl = require('../controllers/habitController');
const { protect } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);
router.get('/', zodValidate({ query: schemas.paginationQuery }), ctrl.list);
router.post('/', zodValidate(schemas.habit), ctrl.create);
router.put('/:id', zodValidate(schemas.habitUpdate), ctrl.update);
router.patch('/:id/toggle', ctrl.toggleToday);
router.delete('/:id', ctrl.remove);

module.exports = router;
