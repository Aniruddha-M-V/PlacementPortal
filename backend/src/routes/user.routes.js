const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserValidator, updateUserValidator } = require('../validators/user.validator');
const { getUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/user.controller');

router.use(protect, authorize('admin'));

router.route('/').get(getUsers).post(createUserValidator, validate, createUser);
router.route('/:id').get(getUserById).put(updateUserValidator, validate, updateUser).delete(deleteUser);

module.exports = router;
