const express = require('express');
const router = express.Router();

const { login, getMe, changePassword, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  loginValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');

// POST /api/auth/login
router.post('/login', loginValidator, validate, login);

// POST /api/auth/logout
router.post('/logout', protect, logout);

// GET /api/auth/me
router.get('/me', protect, getMe);

// PUT /api/auth/change-password
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);

module.exports = router;
