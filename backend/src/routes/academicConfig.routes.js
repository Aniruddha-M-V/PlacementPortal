const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAll, create, update, toggleActive, remove } = require('../controllers/academicConfig.controller');

router.use(protect);

// All authenticated users can read (needed for dropdowns)
router.get('/', getAll);

// Admin-only mutations
router.post('/', authorize('admin'), create);
router.put('/:id', authorize('admin'), update);
router.patch('/:id/toggle', authorize('admin'), toggleActive);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
